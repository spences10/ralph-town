# Full Sandbox Workflow Reference

## Complete Teammate Workflow

### 1. SSH Into Sandbox

```bash
ssh <token>@ssh.app.daytona.io
cd /home/daytona
```

### 2. Clone Repository

```bash
/usr/bin/git clone https://github.com/owner/repo.git
cd repo
```

### 3. Configure Git Identity

```bash
/usr/bin/git config user.email "teammate@example.com"
/usr/bin/git config user.name "teammate"
```

### 4. Create Branch and Work

```bash
/usr/bin/git checkout -b fix/issue-description
# or
/usr/bin/git checkout -b feat/feature-name

# make your changes...
```

### 5. Commit and Push

```bash
/usr/bin/git add -A
/usr/bin/git commit -m "fix: describe the change"
/usr/bin/git push -u origin fix/issue-description
```

### 6. Create PR

```bash
/usr/bin/gh pr create --title "Fix: description" --body "Fixes #N"
```

## Full Path Reference

| Tool | Full Path |
|------|-----------|
| git | `/usr/bin/git` |
| gh | `/usr/bin/gh` |
| bun | `/root/.bun/bin/bun` |
| curl | `/usr/bin/curl` |
| ls | `/bin/ls` |
| cat | `/bin/cat` |
| echo | `/bin/echo` |

## PR Best Practices

- Include `Fixes #N` in PR body to auto-close issues
- Branch naming: `fix/issue-description` or `feat/feature-name`
- Keep PR title under 70 characters

## Error Handling

### SSH Exit Code 255

This is normal for Daytona SSH sessions. Check command output instead
of exit code.

### exec Returns -1

Known bug with snapshots. Always use SSH, not exec.

### Credentials Not Working

Credentials are set up by team-lead BEFORE spawning you. If they
don't work, report to team-lead immediately - don't try to fix.
