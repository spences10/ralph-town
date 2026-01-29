# Ralph-Town: Daytona Sandbox CLI

CLI tool for managing Daytona sandboxes. Designed for Claude Code
teams to work in isolated environments.

## What This Does

When you spawn teammates, they normally share your filesystem. This
tool gives each teammate their own Daytona sandbox instead.

## Using Sandboxes for Teammates

```bash
# 1. Create sandbox for a teammate
ralph-town sandbox create --name feature-work
# Returns sandbox ID

# 2. Get SSH credentials
ralph-town sandbox ssh <sandbox-id>
# Returns: ssh <token>@ssh.app.daytona.io

# 3. Teammate SSHs in and works in isolation
# 4. Delete when done
ralph-town sandbox delete <sandbox-id>
```

## Code Style

- **snake_case** for functions and variables
- **PascalCase** for classes
- **SCREAMING_SNAKE_CASE** for constants
- Prettier: tabs, single quotes, trailing commas, 70 char width
- Use Bun, not npm/pnpm

## Project Structure

```
packages/
├── cli/                 # Main CLI (ralph-town command)
│   └── src/
│       ├── sandbox/     # Sandbox module (create, manage)
│       └── commands/    # CLI commands
└── mcp-ralph-town/      # MCP server wrapping CLI
```

## Development

```bash
bun dev          # Development mode
bun run build    # Compile TypeScript
```

## Key Files

- `packages/cli/src/sandbox/` - Core sandbox module
- `packages/cli/src/commands/sandbox/` - CLI commands
- `docs/RESEARCH.md` - Architecture and findings

## Don't

- Don't run lint:fix
- Don't guess Daytona APIs - check docs first
