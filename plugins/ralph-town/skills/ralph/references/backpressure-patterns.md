# Backpressure Patterns

Good backpressure verifies runtime behavior (exit 0 = pass).

## Good Patterns

```bash
# Build passes
pnpm run build

# Tests pass
pnpm test

# Combined checks
pnpm run build && pnpm run typecheck

# HTTP endpoint works
curl -sf http://localhost:3000/api/health | jq -e '.status == "ok"'
```

## Bad Patterns

Don't verify file existence alone - verify it works:

```bash
# Bad: doesn't verify it works
test -f src/routes/api/health/+server.ts

# Good: verifies runtime behavior
curl -sf http://localhost:3000/api/health
```

## Combined Checks

```bash
# File exists AND build passes
test -f src/lib/components/ThemeToggle.svelte && \
  grep -q 'ThemeToggle' src/routes/+layout.svelte && \
  pnpm run build
```
