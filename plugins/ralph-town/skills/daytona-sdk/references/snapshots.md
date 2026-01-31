# Snapshots

Use pre-built snapshots for instant sandbox creation with tools
pre-installed.

## Creating Snapshots

```typescript
import { Daytona, Image } from '@daytonaio/sdk';

const image = Image.base('debian:bookworm-slim')
	.runCommands(
		'apt-get update && apt-get install -y curl unzip git',
		'curl -fsSL https://bun.sh/install | bash',
	)
	.env({ PATH: '/root/.bun/bin:$PATH' })
	.workdir('/home/daytona')
	.runCommands(
		'/root/.bun/bin/bun add @anthropic-ai/claude-agent-sdk',
	);

const snapshot = await daytona.snapshot.create(
	{ name: 'my-snapshot', image },
	{ onLogs: console.log, timeout: 300 },
);
```

## Using Snapshots

```typescript
const sandbox = await daytona.create({
	snapshot: 'my-snapshot',
	language: 'typescript',
});
// Sandbox has Bun + Agent SDK ready instantly
```

## ralph-town-dev Snapshot

Pre-built snapshot with Bun, TypeScript, and Claude Agent SDK:

```bash
# Create snapshot (run once, ~3 min)
bun run packages/cli/src/core/create-snapshot.ts

# Use via CLI
ralph-town sandbox create --snapshot ralph-town-dev
```

**Note:** Snapshots are pre-built images (like Dockerfiles), not live
VM checkpoints. Define tooling upfront, build once, use many times.

## Installing Bun Without Snapshots (Tier 3+ only)

```typescript
await sandbox.process.executeCommand(
	'curl -fsSL https://bun.sh/install | bash',
);
await sandbox.process.executeCommand(
	'export PATH="$HOME/.bun/bin:$PATH" && bun install',
);
```

**Better approach:** Use snapshots to avoid install overhead.

## Known Limitations

### executeCommand Returns -1 on Snapshot Sandboxes

When using `sandbox.process.executeCommand()` on sandboxes created
from snapshots, the exit code is always `-1` regardless of actual
command success/failure.

**Upstream issue:**
https://github.com/daytonaio/daytona/issues/2283

**Workaround options:**

1. Use SSH instead of executeCommand for reliable exit codes
2. Check command output/stderr for success indicators
3. For teammate workflows, prefer default sandboxes (no snapshot)
   where executeCommand works reliably

```typescript
// Unreliable on snapshot sandboxes - exit code always -1
const result = await sandbox.process.executeCommand('git status');
console.log(result.exitCode); // -1 even on success

// Reliable alternative: use SSH
const sshCreds = await sandbox.ssh();
// Execute via SSH connection instead
```
