# mcp-ralph-town

MCP server wrapping the Ralph Loop CLI for autonomous agent
orchestration.

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

- `ralph_init` - Initialize ralph.json config
- `ralph_run` - Run Ralph Loop orchestration
- `ralph_validate` - Validate ralph.json config

## License

MIT
