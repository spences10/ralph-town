# Ralph-Town: Daytona Sandbox CLI

CLI tool for managing Daytona sandboxes. Designed for Claude Code
teams to work in isolated environments.

## What This Does

When you spawn teammates, they normally share your filesystem. This
tool gives each teammate their own Daytona sandbox instead.

## Teammate Sandbox Workflow

### Prerequisites

1. Set `GH_TOKEN` in `.env` (for teammates to push/PR)

### Per-Teammate Flow

```bash
# IMPORTANT: Source .env first so $GH_TOKEN expands
source .env

# 1. Create sandbox with git token (no snapshot needed)
ralph-town sandbox create --env "GH_TOKEN=$GH_TOKEN"
# Returns sandbox ID

# 2. Install gh CLI in sandbox at runtime
curl -sL https://github.com/cli/cli/releases/download/v2.65.0/gh_2.65.0_linux_amd64.tar.gz | tar -xz -C /tmp && mkdir -p ~/bin && mv /tmp/gh_*/bin/gh ~/bin/

# 3. Teammate works in sandbox:
#    cd /home/daytona
#    git clone https://$GH_TOKEN@github.com/owner/repo.git
#    cd repo
#    git checkout -b fix/my-branch
#    # make changes...
#    git add -A
#    git commit -m "message"
#    git push -u origin fix/my-branch
#    ~/bin/gh pr create --title "title" --body "body"

# 4. Delete sandbox when done
ralph-town sandbox delete <sandbox-id>
```

### SSH Debugging Gotchas

When debugging via SSH, note:
1. **Work dir is `/home/daytona`** - NOT `/workspaces`
2. **PATH may be broken** - use full paths if needed:
   - `/usr/bin/git` not `git`
   - `/bin/ls` not `ls`
3. **GH_TOKEN works** - `$GH_TOKEN` is available if passed via `--env`

### Common Mistakes

1. **GH_TOKEN not expanded** - must source .env first
   - BAD:  `sandbox create --env "GH_TOKEN=$GH_TOKEN"` (without source)
   - GOOD: `source .env && sandbox create --env "GH_TOKEN=$GH_TOKEN"`

2. **gh CLI not installed** - must install at runtime (see workflow above)

### PR Best Practices

- Include `Fixes #N` in PR body to auto-close issues on merge
- Branch naming: `fix/issue-description` or `feat/feature-name`

### Known Issues (READ THESE!)

- **SSH PATH BROKEN** - use full paths: `/usr/bin/git` - #33
- **Work dir is `/home/daytona`** - not /workspaces
- `sandbox exec` returns -1 (use SSH instead) - #31
- `--name` flag doesn't set display name - #34
- **executeCommand returns -1 on snapshots** - [daytonaio/daytona#2283](https://github.com/daytonaio/daytona/issues/2283)

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
