# Ralph-Town: Daytona Sandbox CLI

CLI tool for managing Daytona sandboxes. Designed for Claude Code
teams to work in isolated environments.

## What This Does

When you spawn teammates, they normally share your filesystem. This
tool gives each teammate their own Daytona sandbox instead.

## Teammate Sandbox Workflow

### Prerequisites

1. Create snapshot once (has Bun, TypeScript, Claude Agent SDK):
   ```bash
   bun run packages/cli/src/core/create-snapshot.ts
   ```

2. Set `GH_TOKEN` in `.env` (for teammates to push/PR)

### Per-Teammate Flow

```bash
# 1. Create sandbox from snapshot with git token
ralph-town sandbox create --snapshot ralph-town-dev --env "GH_TOKEN=$GH_TOKEN"
# Returns sandbox ID

# 2. Get SSH credentials
ralph-town sandbox ssh <sandbox-id>
# Returns: ssh <token>@ssh.app.daytona.io

# 3. Teammate works in sandbox:
#    - Clone repo with token: git clone https://$GH_TOKEN@github.com/...
#    - Make changes, commit, push
#    - Create PR via: gh pr create ...

# 4. Delete sandbox when done
ralph-town sandbox delete <sandbox-id>
```

### Known Issues

- `sandbox exec` returns -1 (use SSH instead) - #31
- SSH PATH broken, use full paths: `/usr/bin/git` - #33
- Snapshot missing `gh` CLI (install via apt in sandbox) - #32
- `--name` flag doesn't set display name - #34

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
