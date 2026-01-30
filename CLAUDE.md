# Ralph-Town: Daytona Sandbox CLI

CLI tool for managing Daytona sandboxes. Designed for Claude Code
teams to work in isolated environments.

## What This Does

When you spawn teammates, they normally share your filesystem. This
tool gives each teammate their own Daytona sandbox instead.

## Teammate Sandbox Workflow

### Prerequisites

1. Set `GH_TOKEN` in `.env` (for teammates to push/PR)

2. **Preflight check** - verify snapshot before spawning teammates:
   ```bash
   source .env
   # Create test sandbox
   bun run packages/cli/src/index.ts sandbox create --snapshot ralph-town-dev --json
   # Get SSH and verify tools exist
   bun run packages/cli/src/index.ts sandbox ssh <id> --json
   ssh <token>@ssh.app.daytona.io "which gh && which git && bun --version"
   # Delete test sandbox
   bun run packages/cli/src/index.ts sandbox delete <id>
   ```

3. If tools missing, rebuild snapshot:
   ```bash
   bun run packages/cli/src/core/create-snapshot.ts
   ```

**Required tools in snapshot:** gh, git, bun, curl

### Per-Teammate Flow

```bash
# IMPORTANT: Source .env first so $GH_TOKEN expands
source .env

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

### PR Best Practices

- Include `Fixes #N` in PR body to auto-close issues on merge
- Branch naming: `fix/issue-description` or `feat/feature-name`

### Known Issues

- `sandbox exec` returns -1 (use SSH instead) - #31
- SSH PATH broken, use full paths: `/usr/bin/git` - #33
- `--name` flag doesn't set display name - #34

### Rebuilding Snapshot

After updating `create-snapshot.ts`, rebuild:
```bash
bun run packages/cli/src/core/create-snapshot.ts
```

Current snapshot may be stale - if gh CLI missing, rebuild.

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
