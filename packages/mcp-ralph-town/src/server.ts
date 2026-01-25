import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';
import { McpServer } from 'tmcp';
import { init_tool, run_tool, validate_tool } from './tools/index.js';

export function create_server() {
	const adapter = new ValibotJsonSchemaAdapter();

	const server = new McpServer(
		{
			name: 'mcp-ralph-town',
			version: '0.0.1',
			description:
				'MCP server for Ralph Loop - autonomous agent orchestration',
		},
		{
			adapter,
			capabilities: {
				tools: { listChanged: true },
			},
		},
	);

	// Register tools
	server.tools([init_tool, validate_tool, run_tool]);

	return server;
}
