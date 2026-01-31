---
name: teammate-sandbox-workflow
# prettier-ignore
description: Spawn teammates in isolated Daytona sandboxes. Use when assigning issues to teammates needing their own environment.
---

# Teammate Sandbox Workflow

End-to-end workflow for spawning teammates in isolated sandboxes.

## Prerequisites

- `GH_TOKEN` in `.env` (for push/PR access)
- `ralph-town` CLI available
- Snapshot `ralph-town-dev` exists (has gh, git, bun pre-installed)

## Quick Workflow

### 1. Create Sandbox

```bash
source .env
ralph-town sandbox create --snapshot ralph-town-dev --env "GH_TOKEN=$GH_TOKEN"
# Returns sandbox ID
```

### 2. Get SSH Command

```bash
ralph-town sandbox ssh <sandbox-id>
# Returns: ssh <token>@ssh.app.daytona.io
```

### 3. Spawn Teammate with Instructions

Use Task tool to spawn teammate with:

```
## Your Sandbox
SSH into your Daytona sandbox:
\`\`\`
ssh <token>@ssh.app.daytona.io
\`\`\`

## CRITICAL: Full Paths Required
SSH sessions have broken PATH. ALWAYS use:
- `/usr/bin/git` not `git`
- `/usr/bin/gh` not `gh`
- `/bin/ls`, `/bin/cat`, `/bin/echo`, etc.

## Setup (run these commands via SSH)
\`\`\`bash
cd /home/daytona
/usr/bin/git config --global credential.helper store
/bin/echo "https://oauth2:$GH_TOKEN@github.com" > ~/.git-credentials
/bin/chmod 600 ~/.git-credentials
/usr/bin/git clone https://github.com/<owner>/<repo>.git
cd <repo>
/usr/bin/git config user.email "<teammate>@<team>.dev"
/usr/bin/git config user.name "<teammate>"
/usr/bin/git checkout -b <branch-type>/<branch-name>
\`\`\`

## Task
<task description>

## Submit PR
\`\`\`bash
/usr/bin/git add -A
/usr/bin/git commit -m "<type>: <description>

Fixes #<issue>"
/usr/bin/git push -u origin <branch>
/usr/bin/gh pr create --title "<title>" --body "Fixes #<issue>"
\`\`\`
```

### 4. Cleanup After PR Merged

```bash
ralph-town sandbox delete <sandbox-id>
```

## Critical Reminders

| Issue | Solution |
|-------|----------|
| PATH broken in SSH | Use full paths: `/usr/bin/git` |
| exec returns -1 | Use SSH, not exec |
| Token leaks | Use credential helper, NOT URL tokens |
| Work dir | Always `/home/daytona`, not `/workspaces` |

## References

- [credential-setup.md](references/credential-setup.md) - Secure git auth
- [cleanup.md](references/cleanup.md) - Sandbox lifecycle
