# Full Sandbox Workflow Reference

## Prefer Disposable Runs

For command evals and smoke tests, use one-shot execution:

```bash
ralph-town run --json -- pnpx my-pi@latest --help
ralph-town run --repo https://github.com/owner/repo -- pnpm test
```

This creates a sandbox, runs the command, captures output, and deletes
the sandbox automatically.

## Kept Sandbox Workflow

### 1. Create Sandbox

```bash
ralph-town sandbox create --snapshot ralph-town-dev --json
```

### 2. SSH Into Sandbox

```bash
ralph-town sandbox ssh <sandbox-id> --show-secrets
ssh <token>@ssh.app.daytona.io
cd /home/daytona
```

### 3. Clone Repository

```bash
/usr/bin/git clone https://github.com/owner/repo.git
cd repo
```

### 4. Configure Git Identity

```bash
/usr/bin/git config user.email "sandbox-run@example.invalid"
/usr/bin/git config user.name "Sandbox Runner"
```

### 5. Create Branch and Work

```bash
/usr/bin/git checkout -b fix/issue-description
# or
/usr/bin/git checkout -b feat/feature-name
```

### 6. Verify, Commit, and Push

```bash
/usr/local/bin/pnpm run check
/usr/bin/git add -A
/usr/bin/git commit -m "fix: describe the change"
/usr/bin/git push -u origin fix/issue-description
```

### 7. Create PR

```bash
/usr/bin/gh pr create --title "Fix: description" --body "Fixes #N"
```

## Full Path Reference

| Tool | Full Path             |
| ---- | --------------------- |
| git  | `/usr/bin/git`        |
| gh   | `/usr/bin/gh`         |
| pnpm | `/usr/local/bin/pnpm` |
| curl | `/usr/bin/curl`       |
| ls   | `/bin/ls`             |
| cat  | `/bin/cat`            |
| echo | `/bin/echo`           |

## Error Handling

### SSH Exit Code 255

Daytona SSH sessions can return 255 even when command output is
useful. Inspect stdout/stderr before assuming the task failed.

### SDK exec Returns -1

Known bug with snapshot sandboxes. Prefer SSH-backed `ralph-town run`
or manual SSH for snapshot-based work.

### Credentials Not Working

Stop and report the exact failing command and stderr. Do not keep
trying credential workarounds that may expose tokens.
