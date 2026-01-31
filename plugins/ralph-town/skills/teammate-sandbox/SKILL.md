---
name: teammate-sandbox
# prettier-ignore
description: Spawn teammates in isolated Daytona sandboxes. Use when assigning issues to teammates needing their own environment.
---

# Teammate Sandbox Setup (Team-Lead)

## Quick Start

```bash
source .env  # Load GH_TOKEN

# 1. Create sandbox
ralph-town sandbox create --snapshot ralph-town-dev

# 2. Get SSH token
ralph-town sandbox ssh <sandbox-id> --show-secrets

# 3. Configure git credentials VIA SSH
ssh <token>@ssh.app.daytona.io "
  /usr/bin/git config --global credential.helper store &&
  /bin/echo 'https://oauth2:$GH_TOKEN@github.com' > ~/.git-credentials &&
  /bin/chmod 600 ~/.git-credentials
"

# 4. Spawn teammate with sandbox ID and SSH token
# 5. Delete when done: ralph-town sandbox delete <sandbox-id>
```

## Critical Rules

**Quoting matters** - `$GH_TOKEN` must expand LOCALLY:
- GOOD: `ssh ... "...echo '....$GH_TOKEN@...'..."` (double outside)
- BAD: `ssh ... '...echo "....$GH_TOKEN@..."...'` (single outside)

**Never embed tokens in URLs** - use credential helper instead

**Always use snapshot** - `--snapshot ralph-town-dev` has tools pre-installed

## Preflight Check

```bash
ralph-town sandbox preflight  # Verify snapshot ready
```

## Cleanup

```bash
ralph-town sandbox list       # See all sandboxes
ralph-town sandbox delete <id>  # Delete when teammate done
```

## References

- [references/setup-details.md](references/setup-details.md) - Full setup guide
