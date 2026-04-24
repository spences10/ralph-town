# Daytona Sandbox Research

Research notes and findings from exploring Daytona SDK integration for
Ralph-Town's disposable sandbox execution model.

---

## Problem Statement

LLM evals, CLI smoke tests, and model-generated tooling commands need
a real environment without touching the user's local filesystem. Local
runs create risk:

- **No isolation** - commands can mutate the working tree or machine
- **Credential exposure** - local tokens may leak to logs or
  subprocesses
- **Poor reproducibility** - local state affects results
- **Cleanup burden** - failed experiments leave files and processes
  behind

**Solution**: run commands in disposable Daytona sandboxes, capture
structured results, and delete sandboxes by default.

---

## Key Findings

### 1. Sandbox Creation Times

Tested with pre-baked Node.js image:

| Sandbox | Time      | Notes               |
| ------- | --------- | ------------------- |
| First   | ~18s      | Builds/caches image |
| Second  | **~1.3s** | Uses cached image   |
| Third   | **~1.3s** | Cached              |

**Conclusion**: cached sandboxes are fast enough for practical eval
and smoke-test workflows.

### 2. SSH Access Works

Daytona provides token-based SSH access:

```typescript
const ssh_access = await sandbox.createSshAccess(60); // 60 min expiry
// Returns: { token, command, expires_at }
// Connect with: ssh <token>@ssh.app.daytona.io
```

**Tested and verified** - full shell access, can run arbitrary
commands.

### 3. Pre-baked Images

Default image includes:

- `node:22-bookworm-slim` base
- `git`, `curl` installed
- `pnpm` via Corepack
- `typescript`, `tsx` globally installed

Custom images can add more tools via dockerfile commands.

### 4. SDK Capabilities

The `@daytonaio/sdk` provides:

- `sandbox.process.executeCommand()` - Run commands
- `sandbox.fs.uploadFile()` / `downloadFile()` - File operations
- `sandbox.git.*` - Clone, branch, commit, push
- `sandbox.createSshAccess()` - Get SSH credentials
- `sandbox.delete()` - Cleanup

### 5. executeCommand Limitation on Snapshots

**Critical finding**: `executeCommand()` returns -1 on snapshot-based
sandboxes. This is a known upstream issue.

| Type     | Creation | executeCommand |
| -------- | -------- | -------------- |
| Default  | ~500ms   | Works          |
| Snapshot | ~1.8s    | Broken (-1)    |

**Recommended approach**: use SSH-backed execution for snapshot
sandboxes. This is why `ralph-town run` executes commands over SSH.

---

## Architecture

### Disposable Sandbox Command Execution

```
Local orchestrator
├── Creates Daytona sandbox
├── Gets SSH credentials
├── Optionally clones repository
├── Runs command via SSH
├── Captures stdout/stderr/exit code/duration
└── Deletes sandbox unless --keep is set
```

### Why This Architecture?

1. **Isolation** - each run is independent
2. **Safety** - experiments do not touch the local machine
3. **Reproducibility** - cleaner baseline than local developer state
4. **Disposable** - failed attempts are deleted
5. **Model-neutral** - CLI and MCP surfaces work for any LLM/tool
   runner

---

## CLI Commands

### run

Create a disposable sandbox, run a command, capture output, and delete
it by default.

```bash
ralph-town run -- pnpx my-pi@latest --help
ralph-town run --json -- pnpx my-pi@latest --help
ralph-town run --repo https://github.com/owner/repo -- pnpm test
ralph-town run --keep -- pnpx my-pi@latest --help
```

### sandbox create

Create a reusable Daytona sandbox.

```bash
ralph-town sandbox create [options]
```

**Common flags:**

| Flag                    | Description                   | Default                 |
| ----------------------- | ----------------------------- | ----------------------- |
| `--snapshot <name>`     | Use pre-built snapshot        | -                       |
| `--image <image>`       | Base Docker image             | `node:22-bookworm-slim` |
| `--name <name>`         | Sandbox name                  | auto-generated          |
| `--auto-stop <minutes>` | Auto-stop interval in minutes | 15                      |
| `--timeout <seconds>`   | Creation timeout in seconds   | 120                     |
| `--env-file <path>`     | Path to .env file             | -                       |
| `--env <KEY=VALUE>`     | Environment variables         | -                       |
| `--json`                | Output as JSON                | false                   |

### sandbox ssh

Get SSH credentials for a sandbox.

```bash
ralph-town sandbox ssh <id> [--expires MINUTES]
```

### sandbox list

List active sandboxes.

```bash
ralph-town sandbox list [--json]
```

### sandbox exec

Execute command in an existing sandbox. Prefer `ralph-town run` for
new disposable workloads.

```bash
ralph-town sandbox exec <id> <command>
```

### sandbox delete

Delete a sandbox.

```bash
ralph-town sandbox delete <id>
```

---

## Snapshot Commands

### Preflight

Verify a snapshot has required tools before relying on it in evals or
kept sessions.

```bash
ralph-town sandbox preflight
ralph-town sandbox preflight --snapshot my-snapshot
ralph-town sandbox preflight --json
```

**Tools checked:**

- `/usr/bin/gh` - GitHub CLI
- `/usr/bin/git` - Git
- `/usr/local/bin/pnpm` - pnpm package manager
- `/usr/bin/curl` - curl

### Create Snapshot

```bash
ralph-town sandbox snapshot create
ralph-town sandbox snapshot create --name my-snapshot
ralph-town sandbox snapshot create --force
ralph-town sandbox snapshot create --json
```

**Snapshot includes:**

- Base image: `node:22-bookworm-slim`
- System packages: git, curl, ca-certificates
- GitHub CLI: gh
- pnpm package manager: /usr/local/bin/pnpm
- Pre-installed: @anthropic-ai/claude-agent-sdk
- Working directory: /home/daytona
- PATH fixes: /etc/environment, /etc/profile.d/, ~/.bashrc

---

## Credential Workflow

Local orchestration credentials and sandbox credentials are
intentionally separate.

| Variable                    | Where used | Purpose                                         |
| --------------------------- | ---------- | ----------------------------------------------- |
| `DAYTONA_API_KEY`           | local      | Create/manage Daytona sandboxes                 |
| `GH_TOKEN`                  | local      | Local GitHub CLI or automation                  |
| `ANTHROPIC_API_KEY`         | local      | Local Anthropic/API calls                       |
| `SANDBOX_GH_TOKEN`          | sandbox    | Forwarded as `GH_TOKEN` inside sandbox          |
| `SANDBOX_ANTHROPIC_API_KEY` | sandbox    | Forwarded as `ANTHROPIC_API_KEY` inside sandbox |

`GITHUB_PAT` is a deprecated compatibility alias for
`SANDBOX_GH_TOKEN`.

### Passing Credentials at Sandbox Creation

```bash
ralph-town sandbox create \
  --snapshot ralph-town-dev \
  --env "SANDBOX_GH_TOKEN=$SANDBOX_GH_TOKEN" \
  --env "SANDBOX_ANTHROPIC_API_KEY=$SANDBOX_ANTHROPIC_API_KEY"
```

Inside the sandbox these are available as `$GH_TOKEN` and
`$ANTHROPIC_API_KEY`.

### Secure Git Workflow

Avoid embedding tokens in git URLs. Use credential helper only when
push or private repository access is needed:

```bash
/usr/bin/git config --global credential.helper store
/bin/printf 'https://oauth2:%s@github.com\n' "$GH_TOKEN" > ~/.git-credentials
/bin/chmod 600 ~/.git-credentials
```

Security considerations:

1. **Never bake tokens into snapshots** - pass at runtime via `--env`
2. **Use credential helper** - never embed tokens in git URLs
3. **Env vars are visible in sandbox** - pass only what the run needs
4. **Use scoped tokens** - minimum permissions
5. **Sandboxes are ephemeral** - credentials disappear when deleted

---

## Workflow Example

```bash
# One-shot CLI eval
ralph-town run --json -- pnpx my-pi@latest --help

# Repository smoke test
ralph-town run \
  --repo https://github.com/user/repo \
  -- pnpm test

# Kept debug session
ralph-town sandbox create --snapshot ralph-town-dev --json
ralph-town sandbox ssh <id> --show-secrets
ssh <token>@ssh.app.daytona.io
ralph-town sandbox delete <id>
```

---

## MCP Tools

The MCP server exposes tools for model-neutral sandbox orchestration:

- `sandbox_run` - Create sandbox, run command, delete by default
- `sandbox_create` - Create sandbox, returns ID
- `sandbox_ssh` - Get SSH credentials
- `sandbox_list` - List active sandboxes
- `sandbox_exec` - Run command in existing sandbox
- `sandbox_delete` - Delete sandbox
- `sandbox_env_list` / `sandbox_env_set` - Manage sandbox env vars

---

## Sandbox Resources

Default sandbox specs:

- **CPU**: 1 core
- **Memory**: 1 GB
- **Disk**: 3 GB
- **Auto-stop**: 15 minutes idle
- **Auto-archive**: 7 days

---

## Upstream Issues

Daytona issues affecting this project:

- [#2283](https://github.com/daytonaio/daytona/issues/2283) -
  executeCommand returns -1 on snapshot sandboxes
- [#2535](https://github.com/daytonaio/daytona/issues/2535) - Snapshot
  DX improvements

---

## References

### External

- [Daytona SDK](https://github.com/daytonaio/daytona)
- [Daytona Docs](https://www.daytona.io/docs)

### Internal

- `packages/cli/src/sandbox/` - Sandbox module
- `packages/cli/src/commands/run.ts` - Disposable run command
- `packages/cli/src/commands/sandbox/` - Sandbox management commands
