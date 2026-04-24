# ralph-town

CLI for disposable Daytona sandbox orchestration.

Use it to run LLM evals, package smoke tests, and arbitrary tooling
commands in clean remote environments without touching your local
machine.

## Install

```bash
npm install -g ralph-town
# or
npx ralph-town --help
```

## One-shot runs

```bash
# Run a command in a fresh sandbox and delete it afterwards
ralph-town run -- pnpx my-pi@latest --help

# Keep the sandbox for debugging
ralph-town run --keep -- pnpx my-pi@latest --help

# Clone a repo before running
ralph-town run \
	--repo https://github.com/user/project \
	--branch main \
	-- pnpm test

# Emit machine-readable output
ralph-town run --json -- pnpx my-pi@latest --help
```

## Sandbox commands

- `sandbox create` - Create a Daytona sandbox
- `sandbox list` - List active sandboxes
- `sandbox ssh` - Get SSH credentials
- `sandbox exec` - Execute a command in an existing sandbox
- `sandbox health` - Check sandbox status and optional SSH ping
- `sandbox delete` - Delete a sandbox
- `sandbox env` - Manage sandbox environment variables
- `sandbox snapshot` - Create/preflight reusable snapshots

## Environment Variables

| Variable          | Required | Description                      |
| ----------------- | -------- | -------------------------------- |
| `DAYTONA_API_KEY` | yes      | Daytona API key                  |
| `GH_TOKEN`        | optional | GitHub token for in-sandbox work |

## Development

```bash
pnpm dev
pnpm run check
pnpm run test
pnpm run build
pnpm start
```

## Research

See `docs/RESEARCH.md` for architecture notes.
