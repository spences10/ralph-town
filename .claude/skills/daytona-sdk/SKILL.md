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

## Tier Limitations

**Preview tiers (1-2) have restrictions:**

| Feature               | Preview               | Tier 3+   |
| --------------------- | --------------------- | --------- |
| Internet access       | Restricted (npm only) | Full      |
| Snapshot creation     | Forbidden             | Available |
| curl to external URLs | Blocked               | Allowed   |
| bun.sh install        | Fails                 | Works     |

**Workaround:** Use npm/node instead of bun on preview tiers.

```typescript
// On preview tier, use npm instead of bun
await sandbox.process.executeCommand(
	'npm init -y && npm install <package>',
);
```

## Common Patterns

### Installing Bun in Sandbox (Tier 3+ only)

No native Bun support yet. Install manually:

```typescript
await sandbox.process.executeCommand(
	'curl -fsSL https://bun.sh/install | bash',
);
// Include PATH in each subsequent command
await sandbox.process.executeCommand(
	'export PATH="$HOME/.bun/bin:$PATH" && bun install',
);
```

**Note:** This fails on preview tiers due to restricted internet.

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
