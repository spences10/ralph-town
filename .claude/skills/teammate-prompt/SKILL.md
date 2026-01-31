---
name: teammate-prompt
# prettier-ignore
description: Generate prompts for sandbox teammates. Use when spawning teammates to work on issues in Daytona sandboxes.
---

# Teammate Prompt Generator

Generate prompts for teammates working in Daytona sandboxes.

## Quick Start

1. Read [template.md](references/template.md) for the full prompt
   template
2. Replace `{{variables}}` with actual values
3. Follow [fail-fast.md](references/fail-fast.md) rules

## Core Rules

1. **Sandbox-only** - NEVER use local Read/Write/Edit tools
2. **Fail fast** - INFRA failures=stop, CODE failures=retry once
3. **Full paths** - `/usr/bin/git`, `/usr/bin/gh`,
   `/root/.bun/bin/bun`

## References

- [template.md](references/template.md) - Full prompt template
- [fail-fast.md](references/fail-fast.md) - INFRA vs CODE failure
  handling
- [variables.md](references/variables.md) - All template variables
- [examples.md](references/examples.md) - Complete prompt examples
