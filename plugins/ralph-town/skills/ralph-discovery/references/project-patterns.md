# Project Patterns

## Backpressure Patterns by Project Type

### SvelteKit

```bash
# Build passes
pnpm run build

# File exists in correct location
test -f src/lib/components/MyComponent.svelte

# CSS contains import
grep -q '@plugin.*daisyui' src/routes/layout.css

# Component imported in layout
grep -q 'MyComponent' src/routes/+layout.svelte

# Combined check
test -f src/lib/components/ThemeToggle.svelte && \
  grep -q 'ThemeToggle' src/routes/+layout.svelte && \
  pnpm run build
```

### Next.js

```bash
# Build passes
npm run build

# Component exists
test -f components/MyComponent.tsx

# Import in layout
grep -q 'MyComponent' app/layout.tsx

# CSS contains class
grep -q '.my-class' app/globals.css
```

### Generic Patterns

```bash
# File exists
test -f <path>

# File contains string
grep -q '<string>' <path>

# File matches pattern (recursive)
grep -rq '<pattern>' <directory>

# Multiple files exist
test -f file1 && test -f file2

# Command succeeds
<command> && echo "pass"

# Find file anywhere
find <dir> -name '<pattern>' | grep -q .
```

## Common Discovery Mistakes

### Wrong CSS Path

- **Symptom**: `grep: src/app.css: No such file or directory`
- **Fix**: Use discovery to find actual CSS location
- **Better backpressure**:
  `grep -rq '<pattern>' src/ && pnpm run build`

### Wrong Component Directory

- **Symptom**: Component created but backpressure fails
- **Fix**: Use `find` instead of hardcoded path
- **Better backpressure**:
  `find src -name 'MyComponent.svelte' | grep -q .`

### Hardcoded Package Manager

- **Symptom**: `npm: command not found` (when project uses pnpm)
- **Fix**: Detect from lockfile in discovery phase
- **Better backpressure**: Use detected `${commands.build}`

## Template Variable Substitution

ralph.json can use variables from discovery:

```json
{
	"backpressure": "grep -q 'daisyui' ${paths.css_entry} && ${commands.build}"
}
```

Becomes (after substitution):

```json
{
	"backpressure": "grep -q 'daisyui' src/routes/layout.css && pnpm run build"
}
```

## Flexible vs Strict Backpressure

### Flexible (recommended for unknown projects)

```bash
# Find file anywhere in src
find src -name 'ThemeToggle.svelte' | grep -q .

# Find pattern anywhere
grep -rq 'ThemeToggle' src/routes/

# Build with any package manager
test -f pnpm-lock.yaml && pnpm run build || npm run build
```

### Strict (for known projects)

```bash
# Exact path
test -f src/lib/components/ThemeToggle.svelte

# Exact import location
grep -q "import.*ThemeToggle" src/routes/+layout.svelte
```
