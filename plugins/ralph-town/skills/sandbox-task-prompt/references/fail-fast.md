# Fail Fast Rules

## INFRA failures -> STOP immediately

These are usually outside the task runner's control:

- Command not found / exit 127
- Permission denied
- Network/SSH errors
- Git clone incomplete or missing files
- Sandbox state issues such as files disappearing
- Missing credentials or environment variables
- Package registry or upstream service outages

Action: `"INFRA: [command] failed: [error]. Stopping."`

## CODE failures -> Fix and retry ONCE

These may be caused by task changes:

- Build/lint/type errors from edited files
- Test failures from edited behavior
- Syntax errors introduced during the task

Action: fix the issue, retry once. If retry fails, stop and report.

## When in doubt

If the failure category is unclear, assume INFRA and stop. It is
better to stop early than to waste time or tokens on a broken sandbox.
