# mcp-ralph-town

MCP server wrapping the Ralph Town CLI for Daytona sandbox
management.

## Installation

```bash
npx mcp-ralph-town
```

## Usage

Add to your Claude Code MCP config:

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

- `sandbox_create` - Create a new Daytona sandbox
- `sandbox_list` - List active sandboxes
- `sandbox_ssh` - Get SSH credentials for a sandbox
- `sandbox_delete` - Delete a sandbox
- `sandbox_exec` - Execute command in a sandbox
- `sandbox_env_list` - List environment variables for a sandbox
- `sandbox_env_set` - Set environment variable for a sandbox

## License

MIT
