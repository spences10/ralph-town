# Ralph-GAS Project Instructions

Two-agent TypeScript system using Claude Agent SDK with Daytona
sandbox. Exploring Ralph Loop + Gas Town patterns.

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

## Key Documentation

- `docs/RESEARCH.md` - Architecture exploration, patterns, open questions

## Research First

Before implementing SDK features:

1. Search GitHub issues/PRs:
   `gh search issues --repo daytonaio/daytona <query>`
2. Use mcp-omnisearch for docs
3. Don't guess APIs - read the actual source/docs
