# Sandbox Session Setup - Full Guide

## Prerequisites

1. `DAYTONA_API_KEY` available locally
2. Optional sandbox-scoped credentials in `.env`:
   - `SANDBOX_GH_TOKEN`
   - `SANDBOX_ANTHROPIC_API_KEY`
3. Snapshot ready: `ralph-town sandbox preflight`

## Prefer One-Shot Runs

For evals and smoke tests, prefer the disposable `run` command:

```bash
ralph-town run --json -- pnpx my-pi@latest --help
ralph-town run --repo https://github.com/owner/repo -- pnpm test
```

Use a kept session only when you need interactive debugging.

## Complete Kept-Session Flow

### 1. Load Environment Safely

Use `pnpx nopeek` when inspecting or loading `.env` values.

```bash
pnpx nopeek load .env --only DAYTONA_API_KEY,SANDBOX_GH_TOKEN,SANDBOX_ANTHROPIC_API_KEY
```

### 2. Create Sandbox

```bash
ralph-town sandbox create \
	--snapshot ralph-town-dev \
	--env "SANDBOX_GH_TOKEN=$SANDBOX_GH_TOKEN" \
	--env "SANDBOX_ANTHROPIC_API_KEY=$SANDBOX_ANTHROPIC_API_KEY" \
	--json
```

### 3. Get SSH Access

```bash
ralph-town sandbox ssh <sandbox-id> --show-secrets
# Returns: ssh <token>@ssh.app.daytona.io
```

### 4. Connect

```bash
ssh <token>@ssh.app.daytona.io
cd /home/daytona
```

### 5. Optional Git Credential Helper

If a workflow requires GitHub push access, configure credentials
inside the sandbox without putting tokens in process arguments.

```bash
/usr/bin/git config --global credential.helper store
# Write credentials from an environment variable inside the sandbox.
/bin/printf 'https://oauth2:%s@github.com\n' "$GH_TOKEN" > ~/.git-credentials
/bin/chmod 600 ~/.git-credentials
```

## Security Notes

### Token in URL is Dangerous

```bash
# BAD - leaks to process list and logs
/usr/bin/git clone https://$GH_TOKEN@github.com/owner/repo.git

# GOOD - use credential helper or non-auth clone when possible
/usr/bin/git config --global credential.helper store
```

### Env Vars Are Visible In-Sandbox

Env vars passed via `--env` are readable by processes in that sandbox.
Use sandbox-scoped tokens with minimal permissions.

## Common Mistakes

1. Using local `GH_TOKEN` when `SANDBOX_GH_TOKEN` is intended
2. Embedding tokens in git URLs
3. Keeping sandboxes running after debugging
4. Using SDK `exec` on snapshots instead of SSH-backed `run`
5. Skipping `preflight` before relying on a custom snapshot

## Cost Awareness

- Delete sandboxes when done
- Use `--auto-stop` for kept sandboxes
- Track all sandbox IDs with `ralph-town sandbox list`
