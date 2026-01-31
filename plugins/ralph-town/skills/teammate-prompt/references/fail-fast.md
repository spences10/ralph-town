# Fail Fast Rules

## INFRA failures → STOP immediately

These are unfixable by you. Report and wait for team-lead:

- Command not found / exit 127
- Permission denied
- Network/SSH errors
- Git clone incomplete or missing files
- Sandbox state issues (files disappearing)
- Any "environment" problem

Action: `"INFRA: [command] failed: [error]. Stopping."`

## CODE failures → Fix and retry ONCE

These are YOUR mistakes. You can fix them:

- Build/lint/type errors from your changes
- Test failures from your changes
- Syntax errors in files you edited

Action: Fix the issue, retry. If retry fails → STOP and report.

## When in doubt

If you're not sure whether it's infra or code: **assume infra, STOP**.
Better to stop early than spin wheels. Team-lead can always tell you
to continue.
