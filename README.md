# ralph-town

[![built with vite+](https://img.shields.io/badge/built%20with-Vite+-646CFF?logo=vite&logoColor=white)](https://viteplus.dev)
[![tested with vitest](https://img.shields.io/badge/tested%20with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)

Disposable Daytona sandboxes for LLM evals, CLI smoke tests, and
isolated command execution.

## Why?

LLM tools and eval harnesses often need to run commands against real
projects without touching your local machine. A disposable Daytona
sandbox gives each run a clean environment, controlled credentials,
and structured output that another tool or model can consume.

## Quick start

```bash
# Run a command in a fresh sandbox, then delete it
ralph-town run -- pnpx my-pi@latest --help

# Preserve the sandbox for debugging
ralph-town run --keep -- pnpx my-pi@latest --help

# Run against a repository checkout
ralph-town run \
  --repo https://github.com/user/project \
  -- pnpm test

# Use structured output for eval harnesses
ralph-town run --json -- pnpx my-pi@latest --help
```

`run` creates a sandbox, executes the command through Daytona's
process API, captures stdout/stderr/exit code, and deletes the sandbox
unless `--keep` is set.

## Install

```bash
npm install -g ralph-town
# or
npx ralph-town --help
```

## Commands

```bash
# One-shot command execution
ralph-town run -- <command>

# Create a reusable sandbox
ralph-town sandbox create [--name NAME]

# Get SSH credentials
ralph-town sandbox ssh <id>

# List active sandboxes
ralph-town sandbox list

# Execute command in an existing sandbox
ralph-town sandbox exec <id> <command>

# Check sandbox health
ralph-town sandbox health <id> [--ping]

# Delete sandbox
ralph-town sandbox delete <id>
```

## JSON result shape

```bash
ralph-town run --json -- pnpx my-pi@latest --help
```

```json
{
	"sandbox_id": "abc123",
	"command": "pnpx my-pi@latest --help",
	"repo": null,
	"branch": null,
	"cwd": null,
	"exit_code": 0,
	"stdout": "...",
	"stderr": "",
	"timed_out": false,
	"duration_ms": 2312,
	"kept": false,
	"deleted": true,
	"cleanup_error": null
}
```

## Environment variables

| Variable                    | Context            | Description                                                            |
| --------------------------- | ------------------ | ---------------------------------------------------------------------- |
| `DAYTONA_API_KEY`           | local orchestrator | Daytona API key from [daytona.io](https://daytona.io)                  |
| `GH_TOKEN`                  | local orchestrator | Optional GitHub token for commands run locally                         |
| `ANTHROPIC_API_KEY`         | local orchestrator | Optional Anthropic key for commands run locally                        |
| `SANDBOX_GH_TOKEN`          | sandbox            | Optional GitHub token forwarded into sandboxes as `GH_TOKEN`           |
| `SANDBOX_ANTHROPIC_API_KEY` | sandbox            | Optional Anthropic key forwarded into sandboxes as `ANTHROPIC_API_KEY` |

`GITHUB_PAT` is still accepted as a deprecated compatibility alias for
`SANDBOX_GH_TOKEN`.

## Packages

| Package                   | Description                          |
| ------------------------- | ------------------------------------ |
| `packages/cli`            | Main CLI tool                        |
| `packages/mcp-ralph-town` | MCP server for sandbox orchestration |

## Development

```bash
pnpm dev
pnpm run check
pnpm run test
pnpm run build
```

## Research

See [docs/RESEARCH.md](docs/RESEARCH.md) for Daytona SDK notes and
implementation findings.
