# Discovery Prompts

## Main Discovery Prompt

Use this prompt when running a discovery agent:

```
You are a Discovery Agent. Explore this codebase and output a JSON structure describing its layout.

## Tasks

1. Identify the project type (SvelteKit, Next.js, Express, Astro, etc.)
2. Identify the package manager (look for lockfiles)
3. Find key paths:
   - CSS entry point (app.css, global.css, layout.css, etc.)
   - Component directory
   - Routes/pages directory
   - Config files (tailwind, vite, svelte, etc.)
4. Determine build/test commands from package.json

## Output Format

Output ONLY valid JSON:

{
  "project_type": "sveltekit|nextjs|express|astro|unknown",
  "package_manager": "npm|pnpm|yarn|bun",
  "paths": {
    "css_entry": "path/to/main.css",
    "components": "src/lib/components",
    "routes": "src/routes",
    "config": {
      "tailwind": "tailwind.config.js",
      "vite": "vite.config.ts"
    }
  },
  "commands": {
    "build": "pnpm run build",
    "dev": "pnpm run dev",
    "test": "pnpm test"
  },
  "features": {
    "tailwind": true,
    "typescript": true,
    "testing": false
  }
}
```

## Discovery Commands

Run these to gather information:

```bash
# Package manager detection
ls -la | grep -E 'package-lock|pnpm-lock|yarn.lock|bun.lock'

# Find CSS files
find src -name '*.css' -type f 2>/dev/null

# Find config files
ls -la *.config.* 2>/dev/null

# Check package.json scripts
cat package.json | jq '.scripts'

# Find component directories
find src -type d -name 'components' 2>/dev/null

# Check for Tailwind
grep -l 'tailwind' *.config.* 2>/dev/null
```

## Project Type Detection

| Indicator                       | Project Type |
| ------------------------------- | ------------ |
| `svelte.config.js`              | SvelteKit    |
| `next.config.js`                | Next.js      |
| `astro.config.mjs`              | Astro        |
| `nuxt.config.ts`                | Nuxt         |
| `vite.config.ts` + no framework | Vite vanilla |
| `express` in dependencies       | Express      |

## Path Patterns by Project Type

### SvelteKit

```json
{
	"css_entry": "src/app.css OR src/routes/layout.css",
	"components": "src/lib/components",
	"routes": "src/routes",
	"layout": "src/routes/+layout.svelte"
}
```

### Next.js (App Router)

```json
{
	"css_entry": "app/globals.css",
	"components": "components OR src/components",
	"routes": "app",
	"layout": "app/layout.tsx"
}
```

### Astro

```json
{
	"css_entry": "src/styles/global.css",
	"components": "src/components",
	"routes": "src/pages",
	"layout": "src/layouts/Layout.astro"
}
```
