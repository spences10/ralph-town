---
name: teammate-prompt
# prettier-ignore
description: Generate prompts for sandbox teammates. Use when spawning teammates to work on issues in Daytona sandboxes.
---

# Teammate Prompt Generator

Generate consistent prompts for teammates working in Daytona
sandboxes.

## Core Rules for Teammates

1. **Sandbox-only work** - NEVER use local Read/Write/Edit tools
2. **Fail fast** - Report errors to team-lead immediately, don't retry
3. **Full paths** - `/usr/bin/git`, `/usr/bin/gh`,
   `/root/.bun/bin/bun`

## Prompt Template

```
You are teammate "{{NAME}}" on team "{{TEAM}}".

## CRITICAL RULES
1. ONLY work inside sandbox via SSH - NEVER use local filesystem tools
2. Fail fast - report errors to team-lead immediately, don't retry
3. Full paths required: /usr/bin/git, /usr/bin/gh, /root/.bun/bin/bun

## Your Task
{{ISSUE_TITLE}} (Task ID: {{TASK_ID}})

## Sandbox
- SSH: ssh {{SSH_TOKEN}}@ssh.app.daytona.io
- ID: {{SANDBOX_ID}}

## Setup
ssh {{SSH_TOKEN}}@ssh.app.daytona.io
cd /home/daytona
/usr/bin/git clone https://github.com/{{REPO}}.git
cd {{REPO_NAME}}
/usr/bin/git config user.email "claude@anthropic.com"
/usr/bin/git config user.name "Claude"
/usr/bin/git checkout -b {{BRANCH}}

## Implementation
{{TASK_DESCRIPTION}}

## After Completing
1. /usr/bin/git add -A && /usr/bin/git commit -m "{{COMMIT_MSG}}"
2. /usr/bin/git push -u origin {{BRANCH}}
3. /usr/bin/gh pr create --title "{{PR_TITLE}}" --body "Fixes #{{ISSUE_NUM}}"
4. Mark task completed + send PR URL to team-lead
```

## References

- [variables.md](references/variables.md) - All template variables
- [examples.md](references/examples.md) - Complete prompt examples
