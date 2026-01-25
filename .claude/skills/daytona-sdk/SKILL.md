---
name: daytona-sdk
# prettier-ignore
description: Use when working with Daytona SDK - uploadFile(Buffer, path), Bun install, CodeLanguage options
---

# Daytona SDK

## Quick Start

```typescript
// uploadFile: (content: Buffer, destination: string)
await sandbox.fs.uploadFile(
	Buffer.from(code),
	'/home/daytona/app.ts',
);
```

## Core Principles

- uploadFile takes `(Buffer, path)` not `(path, content)` - reversed
  from intuition
- CodeLanguage only supports: `python`, `typescript`, `javascript`
- Research via `gh search issues --repo daytonaio/daytona <query>`
  before guessing

## Snapshots

Use pre-built snapshots for instant sandbox creation with tools
pre-installed.

### Creating Snapshots

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

### Using Snapshots

```typescript
const sandbox = await daytona.create({
	snapshot: 'my-snapshot',
	language: 'typescript',
});
// Sandbox has Bun + Agent SDK ready instantly
```

**Note:** Snapshots are pre-built images (like Dockerfiles), not live
VM checkpoints. Define tooling upfront, build once, use many times.

## Tier Limitations

| Feature               | Preview (1-2)         | Tier 3+   |
| --------------------- | --------------------- | --------- |
| Internet access       | Restricted (npm only) | Full      |
| Snapshot creation     | Forbidden             | Available |
| curl to external URLs | Blocked               | Allowed   |
| bun.sh install        | Fails                 | Works     |

**Preview tier workaround:** Use npm/node instead of bun.

```typescript
await sandbox.process.executeCommand(
	'npm init -y && npm install <package>',
);
```

## Common Patterns

### Installing Bun in Sandbox (Tier 3+ only)

Without snapshots, install manually:

```typescript
await sandbox.process.executeCommand(
	'curl -fsSL https://bun.sh/install | bash',
);
await sandbox.process.executeCommand(
	'export PATH="$HOME/.bun/bin:$PATH" && bun install',
);
```

**Better approach:** Use snapshots to avoid install overhead.

## Pricing Reference

| Resource      | Per Hour  |
| ------------- | --------- |
| vCPU          | $0.0504   |
| Memory (GiB)  | $0.0162   |
| Storage (GiB) | $0.000108 |

- $200 free credits included
- Startups: up to $50k credits available
- Source: daytona.io/pricing

## Reference Files

- [references/api-gotchas.md](references/api-gotchas.md) - Common API
  mistakes

## Notes

- PR #3241 adds Bun + Claude Agent SDK to default image (pending)
- Issue #3238 tracks native Bun support request
