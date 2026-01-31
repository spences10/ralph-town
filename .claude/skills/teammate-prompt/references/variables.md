# Template Variables

## Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{NAME}}` | Teammate name | fix-98 |
| `{{TEAM}}` | Team name | ralph-town-fixes |
| `{{TASK_ID}}` | Task list ID | 1 |
| `{{ISSUE_NUM}}` | GitHub issue number | 98 |
| `{{ISSUE_TITLE}}` | Brief description | SSH tokens exposed in JSON |
| `{{SSH_TOKEN}}` | SSH access token | TS24aga1jLt47Hm7iwvDs8 |
| `{{SANDBOX_ID}}` | Sandbox UUID | ded60781-9e71-4fd9-81f9-05f60154f786 |
| `{{REPO}}` | Full repo path | spences10/ralph-town |
| `{{REPO_NAME}}` | Repo name only | ralph-town |
| `{{BRANCH}}` | Branch name | fix/98-redact-ssh-tokens |
| `{{TASK_DESCRIPTION}}` | Implementation details | Add --show-secrets flag... |
| `{{COMMIT_MSG}}` | Commit message | fix: redact SSH tokens |
| `{{PR_TITLE}}` | PR title | fix: redact SSH tokens in JSON |

## Getting Variable Values

### SSH Token & Sandbox ID

```bash
# Create sandbox (GH_TOKEN injected into sandbox env)
source .env
ralph-town sandbox create --snapshot ralph-town-dev --env "GH_TOKEN=$GH_TOKEN" --json
# Returns: {"id":"...", "state":"started"}

# Get SSH token
ralph-town sandbox ssh <sandbox-id> --json
# Returns: {"token":"...", "command":"ssh ..."}
```

### Branch Naming

- `fix/{{ISSUE_NUM}}-{{brief-description}}` - Bug fixes
- `feat/{{ISSUE_NUM}}-{{brief-description}}` - Features
- `docs/{{ISSUE_NUM}}-{{brief-description}}` - Documentation

## Important Notes

1. **GH_TOKEN in sandbox** - Token is injected via `--env`, teammate uses `$GH_TOKEN` inside sandbox
2. **Never pass literal tokens** - Use sandbox env vars, not hardcoded values
3. **SSH token != GH_TOKEN** - SSH token is for Daytona access, GH_TOKEN is for GitHub
