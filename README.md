# ralph-town

[![built with vite+](https://img.shields.io/badge/built%20with-Vite+-646CFF?logo=vite&logoColor=white)](https://viteplus.dev)
[![tested with vitest](https://img.shields.io/badge/tested%20with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)

Disposable Daytona sandboxes for LLM evals, CLI smoke tests, and
isolated command execution.

Ralph-Town is a CLI, so any coding harness or LLM tool runner that can
execute shell commands can use it inline. MCP clients can also use the
companion MCP server directly.

## Why?

LLM tools and eval harnesses often need to run commands against real
projects without touching your local machine. A disposable Daytona
sandbox gives each run a clean environment, controlled credentials,
and structured output that another tool or model can consume.

Instead of asking an agent to run a risky install, generated command,
or smoke test on your laptop, ask it to prefix the command with
`ralph-town run --` and inspect the result.

## Quick start

```bash
# Run any command in a fresh sandbox, then delete it
ralph-town run -- node --version

# Smoke-test a CLI without installing it locally
ralph-town run -- pnpx cowsay@latest "hello from a sandbox"

# Run against a clean repository checkout
ralph-town run \
  --repo https://github.com/user/project \
  -- pnpm test

# Preserve the sandbox for debugging
ralph-town run --keep -- sh -lc 'node --version && npm --version'

# Use structured output for eval harnesses
ralph-town run --json -- sh -lc 'printf "ok\\n"; exit 0'
```

`run` creates a sandbox, executes the command through Daytona's
process API, captures stdout/stderr/exit code, and deletes the sandbox
unless `--keep` is set.

## Typical LLM session usage

If your coding assistant has a shell tool, it can run Ralph-Town
inline without any special integration:

```bash
# Check whether a generated command works before trying it locally
ralph-town run -- pnpx some-cli@latest --help

# Try a repo test suite in a disposable clone
ralph-town run \
  --repo https://github.com/user/project \
  -- sh -lc 'pnpm install --frozen-lockfile && pnpm test'

# Capture JSON for automated grading or eval analysis
ralph-town run --json -- python - <<'PY'
print('hello from an isolated Daytona sandbox')
PY
```

For richer tool integration, expose `mcp-ralph-town` to an MCP-capable
client and call `sandbox_run`, `sandbox_create`, `sandbox_exec`, and
the other sandbox tools directly.

## Example: my-pi

[`my-pi`](https://github.com/spences10/my-pi) is my personal coding
agent harness. It is not required for Ralph-Town, but it is a useful
example of the kind of CLI harness you can smoke test inside a
disposable sandbox:

```bash
ralph-town run -- pnpx my-pi@latest --help
```

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
ralph-town run --json -- sh -lc 'printf "ok\\n"'
```

```json
{
	"sandbox_id": "abc123",
	"command": "'sh' '-lc' 'printf \"ok\\\\n\"'",
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
