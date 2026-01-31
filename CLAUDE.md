# Ralph-Town: Daytona Sandbox CLI

CLI for managing Daytona sandboxes. Gives each Claude Code teammate
their own isolated environment instead of sharing your filesystem.

## Prerequisites

1. **Daytona account** - https://app.daytona.io
2. **DAYTONA_API_KEY** - https://app.daytona.io/dashboard/keys
   - Add to `.env`: `DAYTONA_API_KEY=your-key-here`
3. **GH_TOKEN** - GitHub PAT with `repo` scope
   - https://github.com/settings/tokens
   - Add to `.env`: `GH_TOKEN=your-token-here`

## Skills (Detailed Guides)

Use `/sandbox-workflow` for teammate sandbox workflow.
Use `/sandbox-security` for token handling, full paths, env var security.
Use `/snapshot-management` for preflight checks and snapshot creation.
Use `/sandbox-troubleshooting` for known issues and workarounds.

## Quick Reference

```bash
ralph-town sandbox create --snapshot ralph-town-dev  # Create sandbox
ralph-town sandbox ssh <id> --show-secrets           # Get SSH token
ralph-town sandbox delete <id>                       # Cleanup
ralph-town sandbox preflight                         # Verify snapshot
```

## Project Structure

```
packages/
├── cli/                 # Main CLI (ralph-town command)
│   └── src/
│       ├── sandbox/     # Sandbox module
│       └── commands/    # CLI commands
└── mcp-ralph-town/      # MCP server wrapping CLI
```

## Code Style

- **snake_case** for functions/variables
- **PascalCase** for classes
- Prettier: tabs, single quotes, trailing commas, 70 char width
- Use Bun, not npm/pnpm

## Development

```bash
bun dev          # Development mode
bun run build    # Compile TypeScript
```

## Don't

- Don't run lint:fix
- Don't guess Daytona APIs - check docs first
