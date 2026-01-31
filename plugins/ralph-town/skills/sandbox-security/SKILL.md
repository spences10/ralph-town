---
name: sandbox-security
# prettier-ignore
description: Daytona sandbox security. Use for token handling, credential security, full paths in SSH.
---

# Sandbox Security

## Full Paths Required

SSH sessions have broken PATH. ALWAYS use full paths:

| Tool | Path |
|------|------|
| git | `/usr/bin/git` |
| gh | `/usr/bin/gh` |
| bun | `/root/.bun/bin/bun` |
| ls/cat/echo | `/bin/ls`, `/bin/cat`, `/bin/echo` |

## Token Handling

**NEVER embed tokens in URLs** - they leak to process list, logs, errors.

```bash
# BAD - token visible in ps, logs, error messages
/usr/bin/git clone https://$GH_TOKEN@github.com/owner/repo.git

# GOOD - use credential helper
/usr/bin/git config --global credential.helper store
/bin/echo "https://oauth2:$GH_TOKEN@github.com" > ~/.git-credentials
/bin/chmod 600 ~/.git-credentials
/usr/bin/git clone https://github.com/owner/repo.git
```

## Env Var Visibility

Env vars via `--env` are visible to ALL processes in sandbox:
- `env` command lists everything
- `/proc/*/environ` exposes all process env vars
- Any script/binary can read `$GH_TOKEN`

**Mitigations:**
- Only pass credentials the sandbox legitimately needs
- Use short-lived, minimally-scoped tokens
- Delete sandbox promptly after use

## SSH Credential Setup

Team-lead configures credentials BEFORE spawning teammate:

```bash
# $GH_TOKEN expands LOCALLY (double quotes!)
ssh <token>@ssh.app.daytona.io "
  /usr/bin/git config --global credential.helper store &&
  /bin/echo 'https://oauth2:$GH_TOKEN@github.com' > ~/.git-credentials &&
  /bin/chmod 600 ~/.git-credentials
"
```

## Reference Files

- [references/security-details.md](references/security-details.md) -
  Full security explanations

<!--
PROGRESSIVE DISCLOSURE:
- Level 2: Quick reference (~50 lines)
- Level 3: references/security-details.md for deep dives
-->
