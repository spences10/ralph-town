# Ralph-GAS Project Instructions

Two-agent TypeScript system using Claude Agent SDK with Daytona
sandbox.

## Code Style

- **snake_case** for functions and variables
- **PascalCase** for classes
- **SCREAMING_SNAKE_CASE** for constants
- Prettier config: tabs, single quotes, trailing commas, 70 char width

## Running

```bash
bun dev          # Development
bun run build    # Compile TypeScript
bun start        # Build + run compiled
```

## Daytona SDK Notes

### uploadFile Signature

```typescript
// Correct: (content: Buffer, destination: string)
await sandbox.fs.uploadFile(Buffer.from(content), '/path/to/file');

// WRONG: (path, content) - parameters are reversed from intuition
```

### Supported Languages

Only `python`, `typescript`, `javascript` - no native `bun` yet. Bun
support coming via PR #3241.

### Installing Bun in Sandbox

```typescript
await sandbox.process.executeCommand(
	'curl -fsSL https://bun.sh/install | bash',
);
// Then add to PATH: export PATH="$HOME/.bun/bin:$PATH"
```

## Research First

Before implementing SDK features:

1. Search GitHub issues/PRs:
   `gh search issues --repo daytonaio/daytona <query>`
2. Use mcp-omnisearch for docs
3. Don't guess APIs - read the actual source/docs
