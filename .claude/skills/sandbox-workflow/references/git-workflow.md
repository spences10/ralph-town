# Git Workflow in Sandbox

## Setup Credentials (SECURE)

Before cloning, configure git to use credential helper:

```bash
# Configure credential helper (one-time setup)
/usr/bin/git config --global credential.helper store
echo "https://oauth2:$GH_TOKEN@github.com" > ~/.git-credentials
```

This stores credentials securely - tokens never appear in:
- Command line (process list)
- Shell history
- Error messages or logs

## Clone Repository

```bash
cd /home/daytona
# Clone WITHOUT token in URL
/usr/bin/git clone https://github.com/owner/repo.git
cd repo
```

## Create Feature Branch

```bash
/usr/bin/git checkout -b feat/branch-name
# or for fixes:
/usr/bin/git checkout -b fix/issue-description
```

## Commit and Push

```bash
/usr/bin/git add -A
/usr/bin/git commit -m "feat: description of change"
/usr/bin/git push -u origin feat/branch-name
```

## Create Pull Request

```bash
/usr/bin/gh pr create \
  --title "feat: short description" \
  --body "Description here

Fixes #N"
```

## Multiple Tasks

For each new task, start fresh from main:

```bash
/usr/bin/git checkout main
/usr/bin/git pull
/usr/bin/git checkout -b feat/next-task
```
