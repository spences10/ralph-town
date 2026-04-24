---
name: sandbox-session
# prettier-ignore
description: Prepare reusable Daytona sandbox sessions for isolated evals, debugging, or manual command execution.
---

# Sandbox Session Setup

Use this when a one-shot `ralph-town run -- <command>` is not enough
and you need to keep a sandbox around for debugging or repeated
commands.

## Quick Start

```bash
# Verify the reusable snapshot first
ralph-town sandbox preflight

# Create a sandbox
ralph-town sandbox create --snapshot ralph-town-dev --json

# Get SSH access
ralph-town sandbox ssh <sandbox-id> --show-secrets

# Connect
ssh <token>@ssh.app.daytona.io

# Delete when done
ralph-town sandbox delete <sandbox-id>
```

## Forward Sandbox Credentials

Prefer sandbox-scoped credentials when a remote process needs access
to GitHub or model APIs:

```bash
ralph-town sandbox create \
	--snapshot ralph-town-dev \
	--env "SANDBOX_GH_TOKEN=$SANDBOX_GH_TOKEN" \
	--env "SANDBOX_ANTHROPIC_API_KEY=$SANDBOX_ANTHROPIC_API_KEY"
```

Ralph-Town forwards these into the sandbox as the names common tools
expect:

- `SANDBOX_GH_TOKEN` -> `GH_TOKEN`
- `SANDBOX_ANTHROPIC_API_KEY` -> `ANTHROPIC_API_KEY`

`GITHUB_PAT` is only a deprecated compatibility alias for
`SANDBOX_GH_TOKEN`.

## Critical Rules

- Use `ralph-town run -- <command>` for disposable single commands.
- Use a kept sandbox only when you need interactive debugging or
  repeated commands.
- Do not embed tokens in clone URLs. Use env vars or a git credential
  helper.
- Delete kept sandboxes when done.

## References

- [references/setup-details.md](references/setup-details.md) - Full
  setup guide
