# Prompt Examples

## Example: Bug Fix

```
You are teammate "fix-98" on team "ralph-town-fixes".

## CRITICAL RULES
1. ONLY work inside sandbox via SSH - NEVER use local filesystem tools
2. Fail fast - report errors to team-lead immediately, don't retry
3. Full paths required: /usr/bin/git, /usr/bin/gh, /root/.bun/bin/bun

## Your Task
Fix #98 - SSH tokens exposed in JSON output (Task ID: 1)

## Sandbox
- SSH: ssh TS24aga1jLt47Hm7iwvDs8@ssh.app.daytona.io
- ID: ded60781-9e71-4fd9-81f9-05f60154f786

## Setup
ssh TS24aga1jLt47Hm7iwvDs8@ssh.app.daytona.io
cd /home/daytona
/usr/bin/git clone https://$GH_TOKEN@github.com/spences10/ralph-town.git
cd ralph-town
/usr/bin/git config user.email "claude@anthropic.com"
/usr/bin/git config user.name "Claude"
/usr/bin/git checkout -b fix/98-redact-ssh-tokens

## Implementation
SSH tokens are exposed when MCP uses --json flag.

Changes needed in packages/cli/src/commands/sandbox/ssh.ts:
1. Add --show-secrets flag (default: false)
2. Mask token in JSON output by default
3. Add token_masked: true field

## After Completing
1. /usr/bin/git add -A && /usr/bin/git commit -m "fix: redact SSH tokens in JSON output"
2. /usr/bin/git push -u origin fix/98-redact-ssh-tokens
3. /usr/bin/gh pr create --title "fix: redact SSH tokens in JSON" --body "Fixes #98"
4. Mark task #1 completed + send PR URL to team-lead
```

## Example: Documentation

```
You are teammate "docs-104" on team "ralph-town-docs".

## CRITICAL RULES
1. ONLY work inside sandbox via SSH - NEVER use local filesystem tools
2. Fail fast - report errors to team-lead immediately, don't retry
3. Full paths required: /usr/bin/git, /usr/bin/gh

## Your Task
Fix #104 - Standardize env var naming (Task ID: 2)

## Sandbox
- SSH: ssh AbC123xyz@ssh.app.daytona.io
- ID: abc12345-...

## Setup
ssh AbC123xyz@ssh.app.daytona.io
cd /home/daytona
/usr/bin/git clone https://$GH_TOKEN@github.com/spences10/ralph-town.git
cd ralph-town
/usr/bin/git config user.email "claude@anthropic.com"
/usr/bin/git config user.name "Claude"
/usr/bin/git checkout -b docs/104-standardize-env-vars

## Implementation
Standardize on GH_TOKEN everywhere. This is now complete (GH_TOKEN is standard).

Files to update:
- CLAUDE.md
- .env.example
- Any references in docs/

## After Completing
1. /usr/bin/git add -A && /usr/bin/git commit -m "docs: standardize on GH_TOKEN"
2. /usr/bin/git push -u origin docs/104-standardize-env-vars
3. /usr/bin/gh pr create --title "docs: standardize env var naming" --body "Fixes #104"
4. Mark task #2 completed + send PR URL to team-lead
```

## Key Points

1. **$GH_TOKEN in clone URL** - Uses env var injected into sandbox
2. **Explicit file paths** - Tell teammate which files to modify
3. **Clear implementation** - Describe what to change, not just the problem
4. **Full paths always** - /usr/bin/git, not git
