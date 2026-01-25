# Runtime Abstraction Design

Support multiple execution environments: Daytona (cloud), local,
devcontainer.

---

## Goal

Abstract sandbox operations so orchestrator works identically across
runtimes. User selects runtime via config; implementation details
hidden behind interface.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Orchestrator                            │
│                    (runtime-agnostic)                        │
└─────────────────────────┬───────────────────────────────────┘
                          │ RuntimeEnvironment interface
          ┌───────────────┼───────────────────┐
          ▼               ▼                   ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────────┐
│   Daytona   │   │    Local    │   │  DevContainer   │
│   Runtime   │   │   Runtime   │   │    Runtime      │
└─────────────┘   └─────────────┘   └─────────────────┘
      │                 │                   │
      ▼                 ▼                   ▼
  Cloud SDK        child_process      docker exec
```

---

## Interface

```typescript
// packages/cli/src/core/runtime/types.ts
interface RuntimeEnvironment {
	id: string;

	// Lifecycle
	initialize(): Promise<void>;
	cleanup(): Promise<void>;

	// Execution
	execute(cmd: string, opts?: ExecuteOptions): Promise<ExecuteResult>;

	// Filesystem
	write_file(path: string, content: Buffer): Promise<void>;
	read_file(path: string): Promise<Buffer>;

	// Git (optional - some runtimes may not support)
	git?: {
		clone(url: string, path: string, branch?: string): Promise<void>;
		checkout(branch: string, create?: boolean): Promise<void>;
		add(files: string[]): Promise<void>;
		commit(message: string): Promise<void>;
		push(branch: string): Promise<void>;
		status(): Promise<GitStatus>;
	};
}

interface ExecuteOptions {
	cwd?: string;
	timeout?: number; // ms, default 120000
	env?: Record<string, string>;
}

interface ExecuteResult {
	stdout: string;
	stderr: string;
	exit_code: number;
}
```

---

## Runtime Implementations

### 1. Daytona Runtime (current)

Wraps existing `@daytonaio/sdk` calls.

```typescript
// packages/cli/src/core/runtime/daytona.ts
class DaytonaRuntime implements RuntimeEnvironment {
  private daytona: Daytona;
  private sandbox: Sandbox | null = null;

  async initialize() {
    this.sandbox = await this.daytona.create({
      image: RALPH_IMAGE,
      language: 'typescript'
    });
  }

  async execute(cmd, opts) {
    return this.sandbox.process.executeCommand(cmd, ...);
  }

  async write_file(path, content) {
    return this.sandbox.fs.uploadFile(content, path);
  }

  git = {
    clone: (url, path, branch) => this.sandbox.git.clone(...),
    // ... wrap other git methods
  };

  async cleanup() {
    await this.daytona.delete(this.sandbox);
  }
}
```

### 2. Local Runtime

Direct shell execution via `child_process`.

```typescript
// packages/cli/src/core/runtime/local.ts
class LocalRuntime implements RuntimeEnvironment {
	private work_dir: string;

	async initialize() {
		// Create temp directory or use configured path
		this.work_dir = await mkdtemp('/tmp/ralph-');
	}

	async execute(cmd, opts) {
		const { stdout, stderr } = await exec_async(cmd, {
			cwd: opts?.cwd || this.work_dir,
			timeout: opts?.timeout || 120000,
			env: { ...process.env, ...opts?.env },
		});
		return { stdout, stderr, exit_code: 0 };
	}

	async write_file(path, content) {
		await writeFile(path, content);
	}

	git = {
		clone: async (url, path, branch) => {
			await this.execute(`git clone -b ${branch} ${url} ${path}`);
		},
		// ... implement via shell commands
	};

	async cleanup() {
		await rm(this.work_dir, { recursive: true });
	}
}
```

### 3. DevContainer Runtime

Exec into running container.

```typescript
// packages/cli/src/core/runtime/devcontainer.ts
class DevContainerRuntime implements RuntimeEnvironment {
	private container_id: string;

	async initialize() {
		// Find running devcontainer or start one
		const { stdout } = await exec_async(
			'docker ps -q -f "label=devcontainer.local_folder"',
		);
		this.container_id = stdout.trim();
		if (!this.container_id) {
			throw new Error('No running devcontainer found');
		}
	}

	async execute(cmd, opts) {
		const docker_cmd = `docker exec -w ${opts?.cwd || '/workspace'} ${this.container_id} sh -c "${cmd}"`;
		return exec_async(docker_cmd, { timeout: opts?.timeout });
	}

	async write_file(path, content) {
		// Write locally, container mounts workspace
		await writeFile(path, content);
	}

	// Git uses local git (container mounts workspace)
	git = {
		/* same as LocalRuntime */
	};

	async cleanup() {
		// Container persists - no cleanup needed
	}
}
```

---

## Parallel Mode + Git Worktrees

For local/devcontainer parallel execution, use git worktrees:

```
workspace/
├── .git/                    # Main repo
├── src/                     # Main working tree
└── .worktrees/
    ├── criterion-a/         # git worktree add
    ├── criterion-b/
    └── criterion-c/
```

```typescript
// In LocalRuntime.git
async create_worktree(branch: string): Promise<string> {
  const worktree_path = `${this.work_dir}/.worktrees/${branch}`;
  await this.execute(
    `git worktree add ${worktree_path} -b ${branch}`
  );
  return worktree_path;
}

async remove_worktree(path: string): Promise<void> {
  await this.execute(`git worktree remove ${path} --force`);
}
```

Each parallel criterion gets its own worktree → no conflicts.

---

## Config Schema

```typescript
// packages/cli/src/core/types.ts
interface ExecutionConfig {
	mode: 'sequential' | 'parallel';
	runtime: 'daytona' | 'local' | 'devcontainer'; // NEW
	model?: 'haiku' | 'sonnet' | 'opus';
	max_concurrent?: number;
}
```

```json
// ralph.json example
{
	"execution": {
		"mode": "sequential",
		"runtime": "local",
		"model": "haiku"
	}
}
```

---

## Environment Variables

| Variable              | Required             | When           |
| --------------------- | -------------------- | -------------- |
| `ANTHROPIC_API_KEY`   | Always               | Agent SDK auth |
| `DAYTONA_API_KEY`     | runtime=daytona      | Cloud sandbox  |
| `GITHUB_PAT`          | git workflow enabled | Push/PR        |
| `LANGFUSE_SECRET_KEY` | No                   | Telemetry      |
| `LANGFUSE_PUBLIC_KEY` | No                   | Telemetry      |

Validation at startup:

```typescript
function validate_env(config: RalphConfig): void {
	const missing: string[] = [];

	if (!process.env.ANTHROPIC_API_KEY) {
		missing.push('ANTHROPIC_API_KEY');
	}

	if (
		config.execution?.runtime === 'daytona' &&
		!process.env.DAYTONA_API_KEY
	) {
		missing.push('DAYTONA_API_KEY');
	}

	if (config.git && !process.env.GITHUB_PAT) {
		missing.push('GITHUB_PAT');
	}

	if (missing.length > 0) {
		throw new Error(
			`Missing required env vars: ${missing.join(', ')}`,
		);
	}

	// Optional services - log skip, don't error
	if (!process.env.LANGFUSE_SECRET_KEY) {
		console.log('Langfuse not configured - telemetry disabled');
	}
}
```

---

## Factory Pattern

```typescript
// packages/cli/src/core/runtime/factory.ts
function create_runtime(config: RalphConfig): RuntimeEnvironment {
	const runtime_type = config.execution?.runtime || 'daytona';

	switch (runtime_type) {
		case 'daytona':
			return new DaytonaRuntime();
		case 'local':
			return new LocalRuntime(config.repository?.local_path);
		case 'devcontainer':
			return new DevContainerRuntime();
		default:
			throw new Error(`Unknown runtime: ${runtime_type}`);
	}
}
```

---

## Migration Path

1. **Phase 1**: Extract interface, wrap existing Daytona code
2. **Phase 2**: Add LocalRuntime implementation
3. **Phase 3**: Add DevContainerRuntime
4. **Phase 4**: Add worktree support for parallel local

Backwards compatible - default remains `runtime: 'daytona'`.

---

## Trade-offs

|                     | Daytona                | Local     | DevContainer         |
| ------------------- | ---------------------- | --------- | -------------------- |
| **Isolation**       | Full (cloud VM)        | None      | Docker-level         |
| **Speed**           | ~30s first, ~5s cached | Instant   | Instant (if running) |
| **Cost**            | API tier               | Free      | Free                 |
| **Parallel**        | Native (new sandbox)   | Worktrees | Worktrees            |
| **Setup**           | Zero                   | Zero      | Build container once |
| **Dangerous perms** | Safe (isolated)        | Risky     | Safer (contained)    |

---

## DevContainer Spec

For dangerous permission mode (agent can run any bash):

```json
// .devcontainer/devcontainer.json
{
	"name": "ralph-sandbox",
	"image": "oven/bun:1.3.6-debian",
	"features": {
		"ghcr.io/devcontainers/features/common-utils:2": {},
		"ghcr.io/devcontainers/features/git:1": {}
	},
	"postCreateCommand": "npm i -g tsx @anthropic-ai/claude-agent-sdk",
	"remoteEnv": {
		"ANTHROPIC_API_KEY": "${localEnv:ANTHROPIC_API_KEY}",
		"GITHUB_PAT": "${localEnv:GITHUB_PAT}"
	},
	"mounts": [
		"source=${localWorkspaceFolder},target=/workspace,type=bind"
	]
}
```

---

## Open Questions

1. **Local repo handling** - clone fresh or assume pre-cloned?
2. **Worktree cleanup** - auto-prune after parallel run?
3. **DevContainer detection** - label-based or config path?
4. **Agent code location** - bundle with runtime or upload like
   Daytona?

---

## References

- [architecture.md](architecture.md) - Current Daytona approach
- [daytona-sdk.md](daytona-sdk.md) - SDK details
- [git worktrees](https://git-scm.com/docs/git-worktree)
