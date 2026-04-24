# mcp-ralph-town

MCP server for disposable Daytona sandbox orchestration.

It exposes sandbox tools to any MCP-capable LLM client so models can
run commands, smoke tests, and eval workloads in isolated cloud
sandboxes.

## Installation

```bash
npx mcp-ralph-town
```

## Usage

Add to an MCP client config:

```json
{
	"mcpServers": {
		"ralph-town": {
			"command": "npx",
			"args": ["mcp-ralph-town"]
		}
	}
}
```

## Tools

- `sandbox_run` - Create a fresh sandbox, run a command, and delete it
  by default
- `sandbox_create` - Create a new Daytona sandbox
- `sandbox_list` - List active sandboxes
- `sandbox_ssh` - Get SSH credentials for a sandbox
- `sandbox_delete` - Delete a sandbox
- `sandbox_exec` - Execute command in an existing sandbox
- `sandbox_env_list` - List environment variables for a sandbox
- `sandbox_env_set` - Set environment variable for a sandbox

## Example

Ask an MCP client to call `sandbox_run` with:

```json
{
	"command": "pnpx my-pi@latest --help",
	"timeout": 120,
	"keep": false
}
```

## License

MIT
