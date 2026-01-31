# Teammate Sandbox Setup - Full Guide

## Prerequisites

1. `GH_TOKEN` in `.env` (GitHub PAT with `repo` scope)
2. `DAYTONA_API_KEY` in `.env`
3. Snapshot ready: `ralph-town sandbox preflight`

## Complete Setup Flow

### 1. Source Environment

```bash
source .env  # Makes $GH_TOKEN available locally
```

### 2. Create Sandbox

```bash
ralph-town sandbox create --snapshot ralph-town-dev
# Returns: sandbox-id-here
```

### 3. Get SSH Token

```bash
ralph-town sandbox ssh <sandbox-id> --show-secrets
# Returns: ssh abc123@ssh.app.daytona.io
```

### 4. Configure Git Credentials

**BEFORE spawning teammate**, configure credentials via SSH:

```bash
ssh <token>@ssh.app.daytona.io "
  /usr/bin/git config --global credential.helper store &&
  /bin/echo 'https://oauth2:$GH_TOKEN@github.com' > ~/.git-credentials &&
  /bin/chmod 600 ~/.git-credentials
"
```

**Why this works:**
- Double quotes on outside allow `$GH_TOKEN` to expand locally
- Single quotes inside protect the URL from shell interpretation
- Credential helper stores creds securely on disk

### 5. Spawn Teammate

Provide teammate with:
- Sandbox ID
- SSH token (from step 3)
- Repository to clone
- Issue/task to work on

### 6. Cleanup

```bash
ralph-town sandbox delete <sandbox-id>
```

## Security Notes

### Token in URL is Dangerous

```bash
# BAD - leaks to logs/process list
/usr/bin/git clone https://$GH_TOKEN@github.com/owner/repo.git

# GOOD - use credential helper
/usr/bin/git config --global credential.helper store
```

### Env Vars Visible to All Processes

Env vars passed via `--env` are readable by any process in sandbox.
Configure credentials via SSH instead.

## Common Mistakes

1. **Wrong quoting** - single quotes prevent `$GH_TOKEN` expansion
2. **Token in git URL** - visible in process list and logs
3. **Teammate setting credentials** - team-lead must do this
4. **Using exec instead of SSH** - exec returns -1 on snapshots
5. **Missing preflight** - always verify snapshot first

## Cost Awareness

- Delete sandboxes when done
- Track all sandbox IDs
- Auto-stop after 15 min idle
- Auto-archive after 7 days stopped
