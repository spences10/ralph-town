# Git Workflow in Sandbox

## Clone Repository

```bash
cd /home/daytona
/usr/bin/git clone https://$GH_TOKEN@github.com/owner/repo.git
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
