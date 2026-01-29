import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';
import { McpServer } from 'tmcp';
import {
	sandbox_create_tool,
	sandbox_list_tool,
	sandbox_ssh_tool,
	sandbox_delete_tool,
	sandbox_exec_tool,
} from './tools/index.js';

export function create_server() {
	const adapter = new ValibotJsonSchemaAdapter();

	const server = new McpServer(
		{
			name: 'mcp-ralph-town',
			version: '0.0.1',
			description:
				'MCP server for Daytona sandbox management',
		},
		{
			adapter,
			capabilities: {
				tools: { listChanged: true },
			},
		},
	);

	// Register sandbox tools
	server.tools([
		sandbox_create_tool,
		sandbox_list_tool,
		sandbox_ssh_tool,
		sandbox_delete_tool,
		sandbox_exec_tool,
	]);

	return server;
}
