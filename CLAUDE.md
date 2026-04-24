# Ralph-Town: Daytona Sandbox CLI

CLI for disposable Daytona sandboxes. Use it to run LLM evals, CLI
smoke tests, and tooling commands in isolated cloud environments.

## Prerequisites

1. **Daytona account** - https://app.daytona.io
2. **DAYTONA_API_KEY** - https://app.daytona.io/dashboard/keys
   - Add to `.env`: `DAYTONA_API_KEY=your-key-here`
3. Optional scoped tokens
   - `GH_TOKEN` / `ANTHROPIC_API_KEY`: local orchestrator use
   - `SANDBOX_GH_TOKEN`: forwarded into sandboxes as `GH_TOKEN`
   - `SANDBOX_ANTHROPIC_API_KEY`: forwarded into sandboxes as
     `ANTHROPIC_API_KEY`
   - `GITHUB_PAT` is a deprecated alias for `SANDBOX_GH_TOKEN`

## Quick Reference

```bash
ralph-town run -- pnpx my-pi@latest --help           # One-shot sandbox run
ralph-town run --keep -- pnpx my-pi@latest --help    # Keep sandbox for debug
ralph-town sandbox create --snapshot ralph-town-dev  # Create reusable sandbox
ralph-town sandbox ssh <id> --show-secrets           # Get SSH access
ralph-town sandbox delete <id>                       # Cleanup
ralph-town sandbox preflight                         # Verify snapshot
```

## Project Structure

```
packages/
├── cli/                 # Main CLI (ralph-town command)
│   └── src/
│       ├── commands/    # CLI commands
│       └── sandbox/     # Daytona sandbox wrapper
└── mcp-ralph-town/      # MCP server wrapping CLI
```

## Code Style

- **snake_case** for functions/variables
- **PascalCase** for classes
- Vite+ formatting: tabs, single quotes, trailing commas, 70 char
  width
- Use pnpm

## Development

```bash
pnpm dev
pnpm run check
pnpm run test
pnpm run build
```

## Don't

- Don't run lint:fix
- Don't guess Daytona APIs - check docs first
