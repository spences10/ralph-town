---
name: daytona-sdk
# prettier-ignore
description: Use when working with Daytona SDK - uploadFile(Buffer, path), Bun install, CodeLanguage options
---

# Daytona SDK

## Quick Start

```typescript
// uploadFile: (content: Buffer, destination: string)
await sandbox.fs.uploadFile(Buffer.from(code), '/home/daytona/app.ts');
```

## Core Principles

- uploadFile takes `(Buffer, path)` not `(path, content)` - reversed from intuition
- CodeLanguage only supports: `python`, `typescript`, `javascript`
- Research via `gh search issues --repo daytonaio/daytona <query>` before guessing

## Common Patterns

### Installing Bun in Sandbox

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

## Reference Files

- [references/api-gotchas.md](references/api-gotchas.md) - Common API mistakes

## Notes

- PR #3241 adds Bun + Claude Agent SDK to default image (pending)
- Issue #3238 tracks native Bun support request
