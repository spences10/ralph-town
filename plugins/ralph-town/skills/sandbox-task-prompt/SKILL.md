---
name: sandbox-task-prompt
# prettier-ignore
description: Generate sandbox-scoped task prompts for any LLM or tool runner working inside Daytona sandboxes.
---

# Sandbox Task Prompt Generator

Generate prompts that constrain an LLM or tool runner to work only
inside an assigned Daytona sandbox.

## Quick Start

1. Read [template.md](references/template.md) for the prompt template.
2. Replace `{{variables}}` with actual values.
3. Follow [fail-fast.md](references/fail-fast.md) rules.

## Core Rules

1. **Sandbox-only** - never use local filesystem tools for the task.
2. **Fail fast** - infra failures stop; code failures get one retry.
3. **Full paths** - use `/usr/bin/git`, `/usr/bin/gh`,
   `/usr/local/bin/pnpm` when PATH is unreliable.

## References

- [template.md](references/template.md) - Full prompt template
- [fail-fast.md](references/fail-fast.md) - INFRA vs CODE failure
  handling
- [variables.md](references/variables.md) - Template variables
- [examples.md](references/examples.md) - Prompt examples
