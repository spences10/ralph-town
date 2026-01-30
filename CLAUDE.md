# Ralph-Town: Daytona Sandbox CLI

CLI tool for managing Daytona sandboxes. Designed for Claude Code
teams to work in isolated environments.

## What This Does

When you spawn teammates, they normally share your filesystem. This
tool gives each teammate their own Daytona sandbox instead.

## Teammate Sandbox Workflow

### Prerequisites

1. Set `GH_TOKEN` in `.env` (for teammates to push/PR)

2. **Run preflight check** before spawning teammates:
   ```bash
   source .env
   bun run packages/cli/src/index.ts sandbox preflight
   ```
   This verifies gh, git, bun, curl are installed in snapshot.

3. If preflight fails, rebuild snapshot:
   ```bash
   bun run packages/cli/src/core/create-snapshot.ts --force
   ```

### Per-Teammate Flow

**CRITICAL: Always use --snapshot flag. Never omit it.**

```bash
# IMPORTANT: Source .env first so $GH_TOKEN expands
source .env

# 1. Create sandbox FROM SNAPSHOT with git token
#    ⚠️  --snapshot ralph-town-dev is REQUIRED
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

### Common Mistakes

1. **Missing --snapshot flag** - creates empty sandbox without tools
   - BAD:  `sandbox create --json`
   - GOOD: `sandbox create --snapshot ralph-town-dev --json`

2. **GH_TOKEN not expanded** - must source .env first
   - BAD:  `sandbox create --env "GH_TOKEN=$GH_TOKEN"` (without source)
   - GOOD: `source .env && sandbox create --env "GH_TOKEN=$GH_TOKEN"`

3. **Stale snapshot** - gh CLI missing, run preflight to check

### PR Best Practices

- Include `Fixes #N` in PR body to auto-close issues on merge
- Branch naming: `fix/issue-description` or `feat/feature-name`

### Known Issues

- `sandbox exec` returns -1 (use SSH instead) - #31
- SSH PATH broken, use full paths: `/usr/bin/git` - #33
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
