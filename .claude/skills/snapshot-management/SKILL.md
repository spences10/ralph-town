# Snapshot Management

Manage Daytona snapshots for pre-built sandbox environments.

## Creating Snapshots

### Via CLI Script (Recommended)

```bash
# Create ralph-town-dev snapshot
bun run packages/cli/src/core/create-snapshot.ts

# Force recreate (deletes existing first)
bun run packages/cli/src/core/create-snapshot.ts --force
```

### Via SDK

```typescript
import { Daytona, Image } from '@daytonaio/sdk';

const daytona = new Daytona();

const image = Image.base('debian:bookworm-slim')
	.runCommands(
		'apt-get update && apt-get install -y curl git',
		'curl -fsSL https://bun.sh/install | bash',
	)
	.env({ PATH: '/root/.bun/bin:$PATH' })
	.workdir('/home/daytona');

const snapshot = await daytona.snapshot.create(
	{ name: 'my-snapshot', image },
	{ onLogs: console.log, timeout: 300 },
);
```

## Listing Snapshots

```typescript
const snapshots = await daytona.snapshot.list();
for (const s of snapshots) {
	console.log(`${s.name} - ${s.state}`);
}
```

## Checking Snapshot Status

```typescript
const snapshot = await daytona.snapshot.get('ralph-town-dev');
console.log(snapshot.state); // 'ready', 'building', 'error'
```

## Deleting Snapshots

```typescript
const snapshot = await daytona.snapshot.get('old-snapshot');
await daytona.snapshot.delete(snapshot);
```

## Preflight Check

Before spawning teammates, verify snapshot has required tools:

```bash
source .env
bun run packages/cli/src/index.ts sandbox preflight
```

If preflight fails, rebuild:

```bash
bun run packages/cli/src/core/create-snapshot.ts --force
```

## Known Limitations

### executeCommand Returns -1 on Snapshot Sandboxes

`sandbox.process.executeCommand()` always returns exit code `-1` on
sandboxes created from snapshots, regardless of actual success.

**Upstream issue:**
https://github.com/daytonaio/daytona/issues/2283

**Workarounds:**

1. Use SSH instead of executeCommand
2. Check stdout/stderr for success indicators
3. Use default sandboxes (no snapshot) when exit codes matter

## Snapshot Contents (ralph-town-dev)

- Debian bookworm-slim base
- Bun runtime
- git, curl, gh CLI
- @anthropic-ai/claude-agent-sdk
- Working directory: `/home/daytona`
