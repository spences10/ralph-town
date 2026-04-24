# Sandbox Security Details

## Keep Credential Contexts Separate

Local orchestration credentials let Ralph-Town create and manage
sandboxes. Sandbox-forwarded credentials are intentionally separate
and should be lower privilege.

| Variable                    | Where it belongs | Purpose                                         |
| --------------------------- | ---------------- | ----------------------------------------------- |
| `DAYTONA_API_KEY`           | local            | Create/manage Daytona sandboxes                 |
| `GH_TOKEN`                  | local            | Local GitHub CLI or automation                  |
| `ANTHROPIC_API_KEY`         | local            | Local model/API calls                           |
| `SANDBOX_GH_TOKEN`          | sandbox input    | Forwarded as `GH_TOKEN` inside sandbox          |
| `SANDBOX_ANTHROPIC_API_KEY` | sandbox input    | Forwarded as `ANTHROPIC_API_KEY` inside sandbox |

`GITHUB_PAT` is a deprecated compatibility alias for
`SANDBOX_GH_TOKEN`.

## Why Not Reuse Local Tokens?

Disposable evals can run untrusted package install scripts, test code,
or model-generated commands. Giving them local orchestrator
credentials unnecessarily broadens blast radius.

Use sandbox-scoped tokens that can be rotated independently and
granted minimal permissions.

## Avoid Token Leaks

### Bad: Token in URL

```bash
/usr/bin/git clone https://$GH_TOKEN@github.com/owner/repo.git
```

This can leak via:

- process listings
- shell history
- command logs
- error messages

### Better: Credential Helper

```bash
/usr/bin/git config --global credential.helper store
/bin/printf 'https://oauth2:%s@github.com\n' "$GH_TOKEN" > ~/.git-credentials
/bin/chmod 600 ~/.git-credentials
```

Only configure this inside a sandbox when the task needs GitHub push
or private repository access.

## Environment Variable Exposure

Any process in a sandbox can read environment variables. This includes
package lifecycle scripts and test code. Pass only the credentials the
run actually needs.

## Use nopeek Locally

Use `pnpx nopeek` when loading or auditing project `.env` values:

```bash
pnpx nopeek audit
pnpx nopeek load .env --only DAYTONA_API_KEY,SANDBOX_GH_TOKEN
```

Do not print raw token values into the conversation or terminal logs.

## Full Paths in SSH

PATH may be incomplete for non-interactive SSH commands. Prefer full
paths for critical commands:

```bash
/usr/bin/git status
/usr/bin/gh pr list
/usr/local/bin/pnpm test
```
