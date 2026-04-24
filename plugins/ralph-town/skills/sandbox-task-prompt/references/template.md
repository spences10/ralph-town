# Prompt Template

Copy this template and replace `{{variables}}` with actual values.

```
You are working inside an isolated Daytona sandbox.

## CRITICAL RULES
1. ONLY work inside the sandbox via SSH or sandbox command execution.
   NEVER use local filesystem tools for this task.
2. FAIL FAST:
   - INFRA failures (command not found, permission denied, network,
     sandbox issues): STOP immediately and report
     "INFRA: [command] failed: [error]. Stopping."
   - CODE failures (build/lint/test errors from your changes): fix and
     retry ONCE. If retry fails, STOP and report.
   - When in doubt: assume INFRA and STOP.
3. Full paths may be required: /usr/bin/git, /usr/bin/gh,
   /usr/local/bin/pnpm.

## Task
{{TASK_TITLE}} (Task ID: {{TASK_ID}})

## Sandbox
- SSH: ssh {{SSH_TOKEN}}@ssh.app.daytona.io
- ID: {{SANDBOX_ID}}

## Setup
ssh {{SSH_TOKEN}}@ssh.app.daytona.io
cd /home/daytona
/usr/bin/git clone https://github.com/{{REPO}}.git
cd {{REPO_NAME}}
/usr/bin/git config user.email "sandbox-run@example.invalid"
/usr/bin/git config user.name "Sandbox Runner"
/usr/bin/git checkout -b {{BRANCH}}

## Implementation
{{TASK_DESCRIPTION}}

## Verification
{{VERIFY_COMMANDS}}

## After Completing
1. /usr/bin/git add -A && /usr/bin/git commit -m "{{COMMIT_MSG}}"
2. /usr/bin/git push -u origin {{BRANCH}}
3. /usr/bin/gh pr create --title "{{PR_TITLE}}" --body "{{PR_BODY}}"
4. Report the PR URL and sandbox ID.
```

See [variables.md](variables.md) for variable descriptions.
