import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';
import { McpServer } from 'tmcp';
import pkg from '../package.json' with { type: 'json' };
import { register_codemode } from './codemode.js';
import { create_sandbox_tools } from './tools/index.js';

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

	server.tools(create_sandbox_tools(() => server.ctx.signal));
	register_codemode(server);

	return server;
}
