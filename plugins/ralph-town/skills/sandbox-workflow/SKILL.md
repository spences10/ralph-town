---
name: sandbox-workflow
# prettier-ignore
description: Use for teammate sandbox operations - SSH access, git workflow, full paths required
---

# Sandbox Workflow (Teammate)

## Quick Start

SSH into sandbox and work with full paths:

```bash
ssh <token>@ssh.app.daytona.io
cd /home/daytona

# Clone and work (credentials pre-configured by team-lead)
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

**ALWAYS use full paths** - SSH PATH is broken:
- `/usr/bin/git` not `git`
- `/usr/bin/gh` not `gh`
- `/root/.bun/bin/bun` not `bun`
- `/bin/ls`, `/bin/cat`, `/bin/echo`

**Work directory:** `/home/daytona` (not /workspaces)

**Credentials:** Already configured by team-lead. Just clone and push.

## Fail Fast

If sandbox fails:
1. Report error to team-lead immediately
2. DO NOT attempt workarounds
3. DO NOT keep retrying - wasting tokens
4. Team-lead will fix or spawn replacement

## Known Issues

| Issue | Workaround |
|-------|------------|
| SSH PATH broken | Full paths required |
| SSH exit code 255 | Ignore - check output |
| exec returns -1 | Use SSH instead |

## References

- [references/full-workflow.md](references/full-workflow.md) - Complete workflow details
