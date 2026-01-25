---
name: ralph
# prettier-ignore
description: Use when setting up Ralph Loop orchestration, creating ralph.json configs, running autonomous agent workflows, or understanding acceptance criteria patterns
---

# Ralph Loop CLI

Autonomous agent orchestration iterating until acceptance criteria
pass.

## MANDATORY - Ask Before Proceeding

**You MUST ask and wait for answers before running:**

1. **Runtime?** local / daytona / devcontainer
2. **Mode?** sequential / parallel
3. **Max concurrent?** (if parallel, default: 3)
4. **Model?** haiku (default) / sonnet / opus
5. **Review criteria before run?**

**Do NOT proceed until answered.**

## Quick Start

Detect package manager (bun/pnpm/npm/yarn):

```bash
<pkg> x ralph-town init    # Create ralph.json
<pkg> x ralph-town run     # Execute loop
```

## Schema

See [schema-reference.md](references/schema-reference.md)

## References

- [cli-reference.md](references/cli-reference.md)
- [schema-reference.md](references/schema-reference.md)
- [backpressure-patterns.md](references/backpressure-patterns.md)
- [setup-guide.md](references/setup-guide.md)
