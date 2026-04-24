---
name: sandbox-workflow
# prettier-ignore
description: Use for reusable Daytona sandbox workflows, SSH access, git setup, and isolated command execution.
---

# Sandbox Workflow

Prefer the top-level disposable run command for evals and smoke tests:

```bash
ralph-town run --json -- pnpx my-pi@latest --help
ralph-town run --repo https://github.com/owner/repo -- pnpm test
```

Use the manual workflow only when you need a kept sandbox.

## Kept Sandbox Quick Start

```bash
# 1. Verify snapshot tools
ralph-town sandbox preflight

# 2. Create sandbox
ralph-town sandbox create --snapshot ralph-town-dev --json

# 3. Get SSH access
ralph-town sandbox ssh <sandbox-id> --show-secrets

# 4. Connect and work
ssh <token>@ssh.app.daytona.io
cd /home/daytona

# 5. Cleanup
ralph-town sandbox delete <sandbox-id>
```

## GitHub Credentials

If a kept sandbox needs GitHub push access, pass a sandbox-scoped
token:

```bash
ralph-town sandbox create \
	--snapshot ralph-town-dev \
	--env "SANDBOX_GH_TOKEN=$SANDBOX_GH_TOKEN"
```

Inside the sandbox, Ralph-Town exposes that token as `GH_TOKEN`.

Do not paste raw token values into prompts, logs, git remotes, or
command output.

## Full Paths

SSH sessions can have a limited PATH. Use full paths when a command is
not found:

| Tool | Full Path             |
| ---- | --------------------- |
| git  | `/usr/bin/git`        |
| gh   | `/usr/bin/gh`         |
| pnpm | `/usr/local/bin/pnpm` |
| curl | `/usr/bin/curl`       |

## References

- [references/full-workflow.md](references/full-workflow.md) -
  Complete details
