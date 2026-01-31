---
name: sandbox-troubleshooting
# prettier-ignore
description: Daytona sandbox troubleshooting. Use for known issues, common mistakes, workarounds.
---

# Sandbox Troubleshooting

## Known Issues

| Issue | Workaround |
|-------|------------|
| SSH PATH broken | Use full paths: `/usr/bin/git`, `/usr/bin/gh` |
| `exec` returns -1 on snapshots | Use SSH instead (Daytona bug #2283) |
| Work dir is `/home/daytona` | Not /workspaces |
| SSH exit code 255 | Ignore - check output, not exit code |
| `--env` vars not in SSH | Team-lead sets credentials before spawning |

Upstream: [daytonaio/daytona#2283](https://github.com/daytonaio/daytona/issues/2283)

## Common Mistakes

### 1. Not using snapshot

- BAD: `ralph-town sandbox create`
- GOOD: `ralph-town sandbox create --snapshot ralph-town-dev`

Snapshot has gh, git, bun pre-installed.

### 2. Using exec instead of SSH

- BAD: `ralph-town sandbox exec <id> -- git status`
- GOOD: `ssh <token>@ssh.app.daytona.io "/usr/bin/git status"`

exec returns -1 on snapshots (known bug).

### 3. Not using full paths

- BAD: `git clone ...`
- GOOD: `/usr/bin/git clone ...`

PATH is broken in SSH sessions.

### 4. Teammate setting up credentials

- BAD: Teammate runs credential setup commands
- GOOD: Team-lead configures via SSH BEFORE spawning teammate

SSH sessions don't inherit `--env` vars.

### 5. Wrong quoting for $GH_TOKEN

- BAD: `ssh ... '/bin/echo "https://oauth2:$GH_TOKEN@..."'`
- GOOD: `ssh ... "/bin/echo 'https://oauth2:$GH_TOKEN@...'"`

Single quotes prevent local expansion.

### 6. Token in git URL

- BAD: `git clone https://$GH_TOKEN@github.com/...`
- GOOD: Use credential helper:
  ```bash
  /usr/bin/git config --global credential.helper store
  /bin/echo "https://oauth2:$GH_TOKEN@github.com" > ~/.git-credentials
  ```

Tokens in URLs leak to process list, logs, error messages.

## Full Path Reference

| Tool | Path |
|------|------|
| git | `/usr/bin/git` |
| gh | `/usr/bin/gh` |
| bun | `/root/.bun/bin/bun` |
| ls, cat, echo | `/bin/ls`, `/bin/cat`, `/bin/echo` |
| curl | `/usr/bin/curl` |
