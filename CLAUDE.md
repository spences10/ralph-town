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

# 1. Create sandbox FROM SNAPSHOT (has gh, git, bun pre-installed)
ralph-town sandbox create --snapshot ralph-town-dev --env "GH_TOKEN=$GH_TOKEN"
# Returns sandbox ID

# 2. Get SSH access (exec returns -1 on snapshots, use SSH)
ralph-town sandbox ssh <sandbox-id>
# Returns: ssh <token>@ssh.app.daytona.io

# 3. SSH in and work (USE FULL PATHS - PATH is broken)
ssh <token>@ssh.app.daytona.io
cd /home/daytona

# Configure git credential helper (SECURE - token not in URL/logs)
/usr/bin/git config --global credential.helper store
echo "https://oauth2:$GH_TOKEN@github.com" > ~/.git-credentials

# Clone WITHOUT token in URL
/usr/bin/git clone https://github.com/owner/repo.git
cd repo
/usr/bin/git config user.email "teammate@example.com"
/usr/bin/git config user.name "teammate"
/usr/bin/git checkout -b fix/my-branch
# make changes...
/usr/bin/git add -A
/usr/bin/git commit -m "message"
/usr/bin/git push -u origin fix/my-branch
/usr/bin/gh pr create --title "title" --body "Fixes #N"

# 4. Delete sandbox when done
ralph-town sandbox delete <sandbox-id>
```

### CRITICAL: Full Paths Required

SSH sessions have broken PATH. ALWAYS use full paths:
- `/usr/bin/git` not `git`
- `/usr/bin/gh` not `gh`
- `/root/.bun/bin/bun` not `bun`
- `/bin/ls`, `/bin/cat`, `/bin/echo`, etc.

### Common Mistakes

1. **Not using snapshot** - use `--snapshot ralph-town-dev`
   - Snapshot has gh, git, bun pre-installed
   - Without snapshot, you'd need to install tools at runtime

2. **Using exec instead of SSH** - exec returns -1 on snapshots
   - This is a known Daytona bug (#2283)
   - ALWAYS use SSH for snapshot-based sandboxes

3. **Not using full paths** - PATH is broken in SSH
   - BAD: `git clone ...`
   - GOOD: `/usr/bin/git clone ...`

4. **GH_TOKEN not expanded** - must source .env first
   - BAD: `sandbox create --env "GH_TOKEN=$GH_TOKEN"` (without source)
   - GOOD: `source .env && sandbox create --env "GH_TOKEN=$GH_TOKEN"`

5. **Token in git URL** - leaks to logs/process list
   - BAD: `git clone https://$GH_TOKEN@github.com/...`
   - GOOD: Use credential helper (see workflow above)

### PR Best Practices

- Include `Fixes #N` in PR body to auto-close issues on merge
- Branch naming: `fix/issue-description` or `feat/feature-name`

### Known Issues (READ THESE!)

| Issue | Workaround |
|-------|------------|
| SSH PATH broken | Use full paths: `/usr/bin/git`, `/usr/bin/gh` |
| `exec` returns -1 on snapshots | Use SSH instead |
| Work dir is `/home/daytona` | Not /workspaces |
| SSH exit code 255 | Ignore - check output, not exit code |

Upstream: [daytonaio/daytona#2283](https://github.com/daytonaio/daytona/issues/2283)

## Teammate Behavior: Fail Fast

If sandbox/snapshot creation fails:
1. **Report error to team-lead immediately**
2. DO NOT attempt workarounds (installing tools manually, etc.)
3. DO NOT keep retrying - you're wasting tokens
4. Team-lead will either fix the issue or spawn a replacement

Infra problems are team-lead's job, not yours. Spinning wheels on
sandbox issues wastes time when the lead could just spawn another
teammate.

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
