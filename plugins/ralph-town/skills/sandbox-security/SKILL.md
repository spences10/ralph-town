---
name: sandbox-security
# prettier-ignore
description: Daytona sandbox security. Use for token handling, credential boundaries, and full paths in SSH.
---

# Sandbox Security

## Credential Boundaries

Keep local orchestration credentials separate from sandbox
credentials:

| Context            | Variables                                          |
| ------------------ | -------------------------------------------------- |
| Local orchestrator | `DAYTONA_API_KEY`, `GH_TOKEN`, `ANTHROPIC_API_KEY` |
| Sandbox forwarded  | `SANDBOX_GH_TOKEN`, `SANDBOX_ANTHROPIC_API_KEY`    |

Ralph-Town forwards sandbox-scoped variables under the names tools
expect inside the sandbox:

- `SANDBOX_GH_TOKEN` -> `GH_TOKEN`
- `SANDBOX_ANTHROPIC_API_KEY` -> `ANTHROPIC_API_KEY`

`GITHUB_PAT` is only a deprecated compatibility alias for
`SANDBOX_GH_TOKEN`.

## Full Paths Required

SSH sessions can have a limited PATH. Use full paths when commands are
not found:

| Tool        | Path                               |
| ----------- | ---------------------------------- |
| git         | `/usr/bin/git`                     |
| gh          | `/usr/bin/gh`                      |
| pnpm        | `/usr/local/bin/pnpm`              |
| ls/cat/echo | `/bin/ls`, `/bin/cat`, `/bin/echo` |

## Token Safety

**Never embed tokens in URLs**. They can leak to process lists, logs,
and error output.

```bash
# BAD - token visible in ps, logs, error messages
/usr/bin/git clone https://$GH_TOKEN@github.com/owner/repo.git

# GOOD - prefer unauthenticated clone when possible
/usr/bin/git clone https://github.com/owner/repo.git
```

For private repos or push workflows, use a credential helper inside
the sandbox:

```bash
/usr/bin/git config --global credential.helper store
/bin/printf 'https://oauth2:%s@github.com\n' "$GH_TOKEN" > ~/.git-credentials
/bin/chmod 600 ~/.git-credentials
```

## Reference Files

- [references/security-details.md](references/security-details.md) -
  Full security explanations
