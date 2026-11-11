# mcp-ralph-town

MCP server for disposable Daytona sandbox orchestration. Requires
Node.js 22.19 or newer.

The CLI and MCP server call the same shared operations directly. The
MCP server no longer launches CLI subprocesses; `RALPH_TOWN_CLI_PATH`
is no longer used.

## Installation

```bash
pnpx mcp-ralph-town
```

## Usage

Load `DAYTONA_API_KEY` into the server environment, then configure
your MCP client:

```json
{
	"mcpServers": {
		"ralph-town": {
			"command": "pnpm",
			"args": ["dlx", "mcp-ralph-town"]
		}
	}
}
```

The Daytona key stays on the host. Sandbox environment values are
explicit inputs, not a copy of the host environment. Use
`SANDBOX_GH_TOKEN` and `SANDBOX_ANTHROPIC_API_KEY` in `env` entries to
forward them as `GH_TOKEN` and `ANTHROPIC_API_KEY`. `GITHUB_PAT`
remains a deprecated alias for `SANDBOX_GH_TOKEN`.

## Code Mode

Two tools provide JavaScript orchestration through
`@earendil-works/pi-codemode`:

- `search`: omit `query` to list functions, or pass a name or
  space-separated keywords to retrieve TypeScript declarations.
- `execute`: pass `code` containing JavaScript that calls the
  discovered functions with `await tools.<name>(args)`.

For example, search for `sandbox_run`, then execute:

```javascript
const results = await Promise.all(
	['node --version', 'pnpm --version'].map((command) =>
		tools.sandbox_run({ command }),
	),
);
return results.map(
	({ command, exit_code, stdout, cleanup_error }) => ({
		command,
		exit_code,
		stdout,
		cleanup_error,
	}),
);
```

QuickJS runs the orchestration locally; the commands run in Daytona.
Scripts have no Node APIs, local filesystem, network, modules or
timers. Only injected operations can access Daytona.

### Results and lifecycle

- `execute` returns the Code Mode result: `ok`, `value`, `output` and
  `calls`, plus `error` on failure. Only explicit output and the
  return value include operation results.
- Command failures return an `exit_code`; inspect it and
  `cleanup_error`. Invalid arguments and API failures reject nested
  calls. `sandbox_run` reports execution failures in its result.
- The default script deadline is 600 seconds. `timeout_ms` overrides
  it. Operation timeouts are separate: a run accepts `timeout`,
  `create_timeout` and `delete_timeout` in seconds.
- `sandbox_run` owns cleanup on the host, including cancellation.
  Creation cannot be interrupted via AbortSignal; a cancelled run
  cleans up once creation returns. Cleanup can outlast the script
  deadline.
- Disposable runs also use Daytona's `ephemeral` delete-on-stop
  fallback. `keep: true` disables both automatic run cleanup and this
  fallback.
- Calls have real side effects. Script failure does not roll them
  back. Explicitly created sandboxes remain until deleted; existing
  sandbox commands can continue until their command timeout.
- There are no per-operation approval prompts inside a script. State
  is not persisted between calls, including `store()` writes.

## Direct tools

The existing tools remain available and use the same handlers and
validation as Code Mode:

- `sandbox_run`: create, execute and delete by default
- `sandbox_create`: create a sandbox; optional `ephemeral` deletes it
  when stopped
- `sandbox_list`: list sandboxes
- `sandbox_ssh`: masked SSH details; use the CLI's
  `sandbox ssh --show-secrets` to obtain a token
- `sandbox_delete`: delete a sandbox
- `sandbox_exec`: execute in an existing sandbox; output is combined
  in `stdout`, unlike the separate streams returned by `sandbox_run`
- `sandbox_env_list`: read the current environment inherited by new
  processes; values may contain secrets
- `sandbox_env_set`: update the daemon environment for new processes,
  sessions and PTYs; already-running processes are unchanged

The existing first-word command filter for `sandbox_exec` applies to
both interfaces. It is not a shell security boundary. Disposable
`sandbox_run` accepts arbitrary commands as before.

Direct tools return MCP errors for failed commands or cleanup. Code
Mode returns their structured results so scripts can inspect and
aggregate failures.

## License

MIT
