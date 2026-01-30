# SSH Gotchas

## PATH is Broken

The sandbox SSH session has a minimal PATH. Commands like `git`, `gh`,
`ls` will fail with "command not found".

**Solution**: Always use full paths:

| Command | Full Path |
|---------|-----------|
| git | `/usr/bin/git` |
| gh | `/usr/bin/gh` |
| ls | `/bin/ls` |
| cat | `/bin/cat` |
| mkdir | `/bin/mkdir` |
| rm | `/bin/rm` |
| bun | `/root/.bun/bin/bun` |

## Working Directory

- Default: `/home/daytona`
- **NOT** `/workspaces` (common misconception)

## Environment Variables

- `$GH_TOKEN` is available if passed via `--env` flag during create
- Other env vars may not be present

## Exit Codes

SSH commands may return exit code 255 even on success - check actual
output for errors.
