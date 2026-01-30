---
name: sandbox-workflow
# prettier-ignore
description: Use for teammate sandbox operations - SSH access, git workflow, full paths required
---

# Sandbox Workflow

## Quick Start

```bash
# 1. Create sandbox with snapshot
source .env
ralph-town sandbox create --snapshot ralph-town-dev --env "GH_TOKEN=$GH_TOKEN"

# 2. Get SSH access
ralph-town sandbox ssh <sandbox-id>
# Returns: ssh <token>@ssh.app.daytona.io

# 3. Clean up when done
ralph-town sandbox delete <sandbox-id>
```

## Core Principles

- Work dir is `/home/daytona` - NOT `/workspaces`
- **ALWAYS use full paths**: `/usr/bin/git`, `/usr/bin/gh`, `/bin/ls`
- **ALWAYS use --snapshot flag** when creating sandboxes
- Source `.env` before create so `$GH_TOKEN` expands

## References

- [ssh-gotchas.md](references/ssh-gotchas.md) - PATH and environment issues
- [git-workflow.md](references/git-workflow.md) - Clone, branch, PR flow
- [common-mistakes.md](references/common-mistakes.md) - Avoid these errors
