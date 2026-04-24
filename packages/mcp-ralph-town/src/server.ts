import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';
import { McpServer } from 'tmcp';
import pkg from '../package.json' with { type: 'json' };
import {
	sandbox_create_tool,
	sandbox_delete_tool,
	sandbox_env_list_tool,
	sandbox_env_set_tool,
	sandbox_exec_tool,
	sandbox_list_tool,
	sandbox_run_tool,
	sandbox_ssh_tool,
} from './tools/index.js';

export function create_server() {
	const adapter = new ValibotJsonSchemaAdapter();

	const server = new McpServer(
		{
			name: 'mcp-ralph-town',
			version: pkg.version,
			description: 'MCP server for Daytona sandbox management',
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
		sandbox_run_tool,
		sandbox_ssh_tool,
		sandbox_delete_tool,
		sandbox_exec_tool,
		sandbox_env_list_tool,
		sandbox_env_set_tool,
	]);

	return server;
}
