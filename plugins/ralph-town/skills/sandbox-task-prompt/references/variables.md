# Template Variables

## Required Variables

| Variable               | Description            | Example                              |
| ---------------------- | ---------------------- | ------------------------------------ |
| `{{TASK_ID}}`          | Task or eval ID        | eval-001                             |
| `{{TASK_TITLE}}`       | Brief description      | Run CLI help smoke test              |
| `{{SSH_TOKEN}}`        | Daytona SSH token      | TS24aga1jLt47Hm7iwvDs8               |
| `{{SANDBOX_ID}}`       | Sandbox UUID           | ded60781-9e71-4fd9-81f9-05f60154f786 |
| `{{REPO}}`             | Full repo path         | spences10/ralph-town                 |
| `{{REPO_NAME}}`        | Repo name only         | ralph-town                           |
| `{{BRANCH}}`           | Branch name            | eval/cli-help-smoke                  |
| `{{TASK_DESCRIPTION}}` | Implementation details | Run pnpx my-pi@latest --help         |
| `{{VERIFY_COMMANDS}}`  | Commands to verify     | /usr/local/bin/pnpm test             |
| `{{COMMIT_MSG}}`       | Commit message         | test: add CLI smoke coverage         |
| `{{PR_TITLE}}`         | PR title               | test: add CLI smoke coverage         |
| `{{PR_BODY}}`          | PR body                | Adds isolated smoke-test coverage.   |

## Getting Sandbox Values

```bash
ralph-town sandbox create --snapshot ralph-town-dev --json
ralph-town sandbox ssh <sandbox-id> --json --show-secrets
```

## One-Shot Alternative

If no interactive sandbox prompt is needed, prefer:

```bash
ralph-town run --json -- pnpx my-pi@latest --help
ralph-town run --repo https://github.com/owner/repo -- pnpm test
```

## Credential Notes

1. `SANDBOX_GH_TOKEN` is passed into the sandbox as `GH_TOKEN`.
2. `SANDBOX_ANTHROPIC_API_KEY` is passed into the sandbox as
   `ANTHROPIC_API_KEY`.
3. Never paste literal token values into prompts.
4. Daytona SSH tokens are separate from GitHub/model API tokens.
