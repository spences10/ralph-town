---
name: daytona-sdk
# prettier-ignore
description: Use when working with Daytona SDK - uploadFile(Buffer, path), pnpm setup, CodeLanguage options
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
- CodeLanguage only supports: `python`, `typescript`, `javascript`
- Use `@daytona/sdk`, the renamed TypeScript package.
- Check current Daytona docs and installed SDK declarations. The old
  `daytonaio/daytona` repository stopped receiving updates in
  June 2026.
- Use `sandbox.updateEnv()` for variables inherited by newly spawned
  processes; shell `export` in a one-off command does not persist.

## References

- [api-gotchas.md](references/api-gotchas.md) - Common API mistakes
- [snapshots.md](references/snapshots.md) - Pre-built images
- [tier-limits.md](references/tier-limits.md) - Preview vs Tier 3+
