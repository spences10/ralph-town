# Ralph-Town: Daytona Sandbox CLI

CLI tool for managing Daytona sandboxes. Designed for Claude Code
teams to work in isolated environments.

## What This Does

When you spawn teammates, they normally share your filesystem. This
tool gives each teammate their own Daytona sandbox instead.

## Prerequisites

Before using ralph-town, you need:

1. **Daytona account** - Sign up at https://app.daytona.io
2. **DAYTONA_API_KEY** - Get from https://app.daytona.io/dashboard/keys
   - Add to `.env`: `DAYTONA_API_KEY=your-key-here`
3. **GH_TOKEN** - GitHub PAT with `repo` scope
   - Create at https://github.com/settings/tokens
   - Add to `.env`: `GH_TOKEN=your-token-here`

## Teammate Sandbox Workflow

### Prerequisites

1. Set `GH_TOKEN` in `.env` (for teammates to push/PR)
2. Verify snapshot is ready: `ralph-town sandbox preflight`

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
/bin/echo "https://oauth2:$GH_TOKEN@github.com" > ~/.git-credentials
/bin/chmod 600 ~/.git-credentials

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

### CRITICAL: Never Embed Tokens in URLs

**BAD - tokens leak via process list, logs, errors:**
```bash
/usr/bin/git clone https://$GH_TOKEN@github.com/owner/repo.git
```

**GOOD - use credential helper:**
```bash
/usr/bin/git config --global credential.helper store
/bin/echo "https://oauth2:$GH_TOKEN@github.com" > ~/.git-credentials
/bin/chmod 600 ~/.git-credentials
/usr/bin/git clone https://github.com/owner/repo.git
```

Why tokens in URLs are dangerous:
- Visible in `ps aux` process list
- Logged in shell history
- Exposed in git error messages
- May appear in debug logs

### Common Mistakes

1. **Not using snapshot** - use `--snapshot ralph-town-dev`
   - Snapshot has gh, git, bun pre-installed
   - Without snapshot, you would need to install tools at runtime

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

## Snapshot Management

### sandbox preflight

Verify snapshot has required tools before spawning teammates.

```bash
# Check default snapshot (ralph-town-dev)
ralph-town sandbox preflight

# Check specific snapshot
ralph-town sandbox preflight --snapshot my-snapshot

# JSON output for scripts
ralph-town sandbox preflight --json
```

**Flags:**
- `--snapshot <name>` - Snapshot to test (default: ralph-town-dev)
- `--json` - Output as JSON

**What it checks:**
- `/usr/bin/gh` - GitHub CLI
- `/usr/bin/git` - Git
- `/root/.bun/bin/bun` - Bun runtime
- `/usr/bin/curl` - curl

**Use case:** Run before spawning teammates to ensure snapshot is
properly configured. If preflight fails, rebuild the snapshot.

### sandbox snapshot create

Create a pre-baked snapshot with all required tools.

```bash
# Create default snapshot
ralph-town sandbox snapshot create

# Create with custom name
ralph-town sandbox snapshot create --name my-snapshot

# Force recreate existing snapshot
ralph-town sandbox snapshot create --force

# JSON output
ralph-town sandbox snapshot create --json
```

**Flags:**
- `--name <name>` - Snapshot name (default: ralph-town-dev)
- `--force` - Delete existing snapshot and recreate
- `--json` - Output as JSON

**What the snapshot includes:**
- Base image: `debian:bookworm-slim`
- Tools: git, curl, gh CLI, bun
- SDK: @anthropic-ai/claude-agent-sdk
- Working dir: /home/daytona

**Build time:** ~2-3 minutes

## Teammate Behavior: Fail Fast

If sandbox/snapshot creation fails:
1. **Report error to team-lead immediately**
2. DO NOT attempt workarounds (installing tools manually, etc.)
3. DO NOT keep retrying - you are wasting tokens
4. Team-lead will either fix the issue or spawn a replacement

Infra problems are team-lead's job, not yours. Spinning wheels on
sandbox issues wastes time when the lead could just spawn another
teammate.

## Dogfooding Checklist

Steps for team-lead spawning teammates in sandboxes:

### Before Spawning

- [ ] Ensure `GH_TOKEN` is set in `.env`
- [ ] Source `.env` before running commands: `source .env`

### Per-Teammate Setup

- [ ] Create sandbox with snapshot:
  ```bash
  ralph-town sandbox create --snapshot ralph-town-dev --env "GH_TOKEN=$GH_TOKEN"
  ```
- [ ] Get SSH command (NOT exec - it's broken on snapshots):
  ```bash
  ralph-town sandbox ssh <sandbox-id>
  ```
- [ ] Configure git credential helper in sandbox (secure, no token in URL):
  ```bash
  /usr/bin/git config --global credential.helper store
  /bin/echo "https://oauth2:$GH_TOKEN@github.com" > ~/.git-credentials
  /bin/chmod 600 ~/.git-credentials
  ```
- [ ] Clone repo and configure git identity

### During Work

- [ ] Use full paths for all commands (`/usr/bin/git`, `/usr/bin/gh`)
- [ ] Work in `/home/daytona` (not /workspaces)

### After Completion

- [ ] Verify PR was created successfully
- [ ] Delete sandbox when teammate finishes:
  ```bash
  ralph-town sandbox delete <sandbox-id>
  ```
- [ ] Track sandbox IDs to ensure cleanup

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
