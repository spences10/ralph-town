---
name: sandbox-workflow
# prettier-ignore
description: Use for teammate sandbox operations - SSH access, git workflow, full paths required
---

# Sandbox Workflow

## Team-Lead Quick Start

```bash
source .env  # Load GH_TOKEN

# 1. Create sandbox
ralph-town sandbox create --snapshot ralph-town-dev

# 2. Get SSH token
ralph-town sandbox ssh <sandbox-id> --show-secrets

# 3. Configure credentials via SSH (BEFORE spawning teammate)
ssh <token>@ssh.app.daytona.io "
  /usr/bin/git config --global credential.helper store &&
  /bin/echo 'https://oauth2:$GH_TOKEN@github.com' > ~/.git-credentials &&
  /bin/chmod 600 ~/.git-credentials
"

# 4. Spawn teammate with SSH token
# 5. Cleanup: ralph-town sandbox delete <sandbox-id>
```

## Teammate Quick Start

```bash
ssh <token>@ssh.app.daytona.io
cd /home/daytona

# Credentials pre-configured by team-lead
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
```

## Critical Rules

**Full paths required** - SSH PATH is broken:
- `/usr/bin/git`, `/usr/bin/gh`, `/root/.bun/bin/bun`
- `/bin/ls`, `/bin/cat`, `/bin/echo`

**Work directory:** `/home/daytona` (not /workspaces)

**Quoting:** `$GH_TOKEN` must expand locally:
- GOOD: `ssh ... "...echo '...$GH_TOKEN@...'..."`
- BAD: `ssh ... '...echo "...$GH_TOKEN@..."...'`

## Fail Fast (Teammates)

If sandbox fails:
1. Report error to team-lead immediately
2. DO NOT attempt workarounds
3. DO NOT keep retrying - wasting tokens

## References

- [references/full-workflow.md](references/full-workflow.md) - Complete details
