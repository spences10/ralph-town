# Prompt Examples

## Example: CLI Smoke Test

```
You are working inside an isolated Daytona sandbox.

## CRITICAL RULES
1. ONLY work inside the sandbox via SSH or sandbox command execution.
2. Fail fast on infra failures. Fix code failures once, then stop if the
   retry fails.
3. Full paths may be required: /usr/bin/git, /usr/bin/gh,
   /usr/local/bin/pnpm.

## Task
Run my-pi help smoke test (Task ID: eval-001)

## Sandbox
- SSH: ssh TS24aga1jLt47Hm7iwvDs8@ssh.app.daytona.io
- ID: ded60781-9e71-4fd9-81f9-05f60154f786

## Setup
ssh TS24aga1jLt47Hm7iwvDs8@ssh.app.daytona.io
cd /home/daytona

## Implementation
Run:
/usr/local/bin/pnpm dlx my-pi@latest --help

Capture stdout, stderr, exit code, and any install warnings.

## Verification
The command should exit 0 and print CLI usage.

## After Completing
Report the command, exit code, summarized output, and sandbox ID.
```

## Example: Repository Task

```
You are working inside an isolated Daytona sandbox.

## CRITICAL RULES
1. ONLY work inside the sandbox via SSH or sandbox command execution.
2. Fail fast on infra failures. Fix code failures once, then stop if the
   retry fails.
3. Full paths may be required: /usr/bin/git, /usr/bin/gh,
   /usr/local/bin/pnpm.

## Task
Clarify sandbox credential naming (Task ID: docs-104)

## Sandbox
- SSH: ssh AbC123xyz@ssh.app.daytona.io
- ID: abc12345-...

## Setup
ssh AbC123xyz@ssh.app.daytona.io
cd /home/daytona
/usr/bin/git clone https://github.com/spences10/ralph-town.git
cd ralph-town
/usr/bin/git config user.email "sandbox-run@example.invalid"
/usr/bin/git config user.name "Sandbox Runner"
/usr/bin/git checkout -b docs/104-sandbox-credentials

## Implementation
Clarify that SANDBOX_GH_TOKEN is local input and GH_TOKEN is the
in-sandbox name. Update AGENTS.md, .env.example, and docs.

## Verification
/usr/local/bin/pnpm run check

## After Completing
1. /usr/bin/git add -A && /usr/bin/git commit -m "docs: clarify sandbox credential naming"
2. /usr/bin/git push -u origin docs/104-sandbox-credentials
3. /usr/bin/gh pr create --title "docs: clarify sandbox credential naming" --body "Clarifies sandbox-scoped credential naming."
4. Report the PR URL and sandbox ID.
```

## Key Points

1. Keep task instructions sandbox-scoped.
2. Do not expose literal token values in prompts.
3. Prefer `ralph-town run --json -- <command>` for simple evals.
4. Use full paths when PATH is unreliable.
