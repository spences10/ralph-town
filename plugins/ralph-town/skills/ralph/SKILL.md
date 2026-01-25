---
name: ralph
# prettier-ignore
description: Use when setting up Ralph Loop orchestration, creating ralph.json configs, running autonomous agent workflows, or understanding acceptance criteria patterns
---

# Ralph Loop CLI

Autonomous agent orchestration iterating until acceptance criteria
pass.

## Quick Start

```bash
npx ralph-town init    # Create ralph.json
npx ralph-town run     # Execute loop
```

## Core Schema

```json
{
	"repository": { "url": "...", "branch": "main" },
	"execution": {
		"mode": "sequential",
		"runtime": "local",
		"model": "haiku"
	},
	"acceptance_criteria": [
		{
			"id": "ac-001",
			"description": "What to achieve",
			"steps": ["Instructions for agent"],
			"backpressure": "pnpm run build",
			"passes": false
		}
	],
	"max_iterations_per_criterion": 3
}
```

## Backpressure

Good: verifies runtime behavior (exit 0 = pass)

```bash
pnpm run build && pnpm test
```

## References

- [cli-reference.md](references/cli-reference.md) - Commands, env vars
- [schema-reference.md](references/schema-reference.md) - Full schema
  details
- [backpressure-patterns.md](references/backpressure-patterns.md) -
  Verification patterns
