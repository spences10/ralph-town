---
name: teammate-setup
# prettier-ignore
description: Full teammate provisioning with sandbox creation, credentials, repo clone, and git config
---

# Teammate Setup Skill

Complete workflow for provisioning a new teammate with their own
isolated Daytona sandbox, including credentials and repository setup.

## Prerequisites

- `GH_TOKEN` set in `.env` file
- `ralph-town` CLI installed and configured
- Daytona API access configured

## Full Provisioning Workflow

### Step 1: Create Sandbox with Credentials

```bash
# CRITICAL: Source .env first so $GH_TOKEN expands
source .env

# Create sandbox with GitHub token injected
ralph-town sandbox create --env "GH_TOKEN=$GH_TOKEN"
# Returns: Sandbox ID (e.g., 7f958545-163f-4681-a416-296003b02b45)
```

### Step 2: Get SSH Connection Details

```bash
ralph-town sandbox ssh <sandbox-id>
# Returns: ssh <token>@ssh.app.daytona.io
```

### Step 3: Setup Commands for Teammate

Send these instructions to the teammate:

```bash
# Install gh CLI (required for PRs)
curl -sL https://github.com/cli/cli/releases/download/v2.65.0/gh_2.65.0_linux_amd64.tar.gz | tar -xz -C /tmp && mkdir -p ~/bin && mv /tmp/gh_*/bin/gh ~/bin/

# Clone repository with authentication
git clone https://$GH_TOKEN@github.com/<owner>/<repo>.git
cd <repo>

# Configure git identity
git config user.email "claude@anthropic.com"
git config user.name "Claude"

# Create feature branch
git checkout -b <branch-type>/<branch-name>
```

### Step 4: Cleanup When Done

```bash
ralph-town sandbox delete <sandbox-id>
```

## Environment Variables

The following environment variables are injected into the sandbox:

| Variable   | Purpose                          | Required |
|------------|----------------------------------|----------|
| `GH_TOKEN` | GitHub PAT for clone/push/PR     | Yes      |

### Adding Additional Env Vars

```bash
ralph-town sandbox create \
  --env "GH_TOKEN=$GH_TOKEN" \
  --env "ANOTHER_VAR=value"
```

## Teammate Message Template

When assigning a teammate to work in a sandbox, send them:

```
**Your Sandbox:**
- SSH: `ssh <token>@ssh.app.daytona.io`
- Sandbox ID: <sandbox-id>
- Work directory: /home/daytona (or /root depending on sandbox)

**Setup Steps:**
1. SSH into your sandbox
2. Install gh CLI (see command above)
3. Clone repo: `git clone https://$GH_TOKEN@github.com/<owner>/<repo>.git`
4. cd <repo>
5. Configure git: `git config user.email "claude@anthropic.com" && git config user.name "Claude"`
6. Create branch: `git checkout -b <branch-type>/<branch-name>`

**After completing work:**
- Commit, push, and create PR with gh CLI
- Report back with PR URL
```

## Known Issues

- **PATH may be broken** - Use full paths if needed:
  `/usr/bin/git`, `/bin/ls`
- **Work dir varies** - Check `pwd` on first connection
  (usually `/home/daytona` or `/root`)
- **Exit codes return -1** - Commands may succeed despite
  exit code (see issue #31)

## Quick Reference

| Action              | Command                                        |
|---------------------|------------------------------------------------|
| Create sandbox      | `ralph-town sandbox create --env "..."`        |
| Get SSH             | `ralph-town sandbox ssh <id>`                  |
| Delete sandbox      | `ralph-town sandbox delete <id>`               |
| Install gh          | `curl -sL ... \| tar ... && mv ...`            |
| Clone with auth     | `git clone https://$GH_TOKEN@github.com/...`   |
| Create PR           | `~/bin/gh pr create --title "..." --body "..."` |
