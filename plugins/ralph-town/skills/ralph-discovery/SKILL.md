---
name: ralph-discovery
# prettier-ignore
description: Explore a codebase before running ralph. Identifies paths, structure, and generates accurate backpressure commands. Use when creating ralph.json or when backpressure keeps failing.
---

# Ralph Discovery

Explore a codebase to generate accurate ralph.json configuration.

## Quick Start

```bash
# Detect project type and paths
ls *.config.* package.json pnpm-lock.yaml 2>/dev/null
cat package.json | jq '.scripts'
```

## When to Use

- Before creating a new ralph.json
- When backpressure commands keep failing (wrong paths)

## What It Discovers

- **Project type**: SvelteKit, Next.js, Express, etc.
- **Package manager**: npm, pnpm, yarn, bun
- **Key paths**: CSS entry, component dirs, config files
- **Build commands**: Commands to verify build works

## Output: `.ralph-discovery.json`

```json
{
	"project_type": "sveltekit",
	"package_manager": "pnpm",
	"paths": { "css_entry": "src/routes/layout.css" },
	"commands": { "build": "pnpm run build" }
}
```

Use in ralph.json backpressure: `grep -q 'daisyui' ${paths.css_entry}`

## References

- [discovery-prompts.md](references/discovery-prompts.md) - Agent
  prompts
- [project-patterns.md](references/project-patterns.md) - Backpressure
  patterns
