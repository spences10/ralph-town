import {
	CodemodeSandbox,
	renderToolSignature,
	type CodemodeTool,
} from '@earendil-works/pi-codemode';
import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';
import type { McpServer } from 'tmcp';
import * as v from 'valibot';
import { sandbox_operations } from './tools/index.js';

export async function create_codemode_tools(): Promise<
	CodemodeTool[]
> {
	const adapter = new ValibotJsonSchemaAdapter();
	return Promise.all(
		sandbox_operations.map(async (operation) => ({
			name: operation.name,
			description: operation.description,
			inputSchema: {
				...(await adapter.toJsonSchema(operation.schema)),
			},
			execute: (
				input: unknown,
				{ signal }: { signal: AbortSignal },
			) => operation.execute(input, signal),
		})),
	);
}

export async function execute_code(
	code: string,
	tools: CodemodeTool[],
	options: { timeout_ms?: number; signal?: AbortSignal } = {},
) {
	const sandbox = new CodemodeSandbox({
		tools,
		// Match the previous disposable-run MCP deadline, not Omnisearch's 60s.
		timeoutMs: options.timeout_ms ?? 600_000,
	});
	try {
		return await sandbox.execute(code, { signal: options.signal });
	} finally {
		await sandbox.close();
	}
}

export function register_codemode(
	server: McpServer<v.GenericSchema>,
) {
	const tools = create_codemode_tools();
	server.tool(
		{
			name: 'search',
			description:
				'Discover sandbox functions for Code Mode. Omit query to list names and descriptions, or supply a function name or space-separated keywords for TypeScript declarations.',
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
			schema: v.object({
				query: v.optional(v.pipe(v.string(), v.regex(/\S/))),
			}),
		},
		async ({ query }) => {
			const terms =
				query?.toLowerCase().split(/\s+/).filter(Boolean) ?? [];
			const matches = (await tools).filter((entry) =>
				terms.every((term) =>
					`${entry.name} ${entry.description}`
						.toLowerCase()
						.includes(term),
				),
			);
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(
							matches.map((entry) => ({
								name: entry.name,
								description: entry.description,
								...(query
									? {
											declaration: `declare const tools: {\n${renderToolSignature(entry)}\n};`,
										}
									: {}),
							})),
						),
					},
				],
			};
		},
	);
	server.tool(
		{
			name: 'execute',
			description:
				'Run JavaScript to orchestrate Daytona sandboxes. Discover functions with search, then await tools.<name>(args). Return or text() only the results needed. No local filesystem, network, Node APIs or credentials are exposed to the script. Calls have real side effects and are not rolled back. sandbox_run owns cleanup on the host unless keep is true; cleanup may continue after cancellation. Existing-sandbox commands may continue until their command timeout. State is not persisted between calls. Default script deadline: 600 seconds; timeout_ms overrides it.',
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: false,
				openWorldHint: true,
			},
			schema: v.object({
				code: v.pipe(v.string(), v.regex(/\S/)),
				timeout_ms: v.optional(
					v.pipe(v.number(), v.integer(), v.minValue(1)),
				),
			}),
		},
		async ({ code, timeout_ms }) => {
			const result = await execute_code(code, await tools, {
				timeout_ms,
				signal: server.ctx.signal,
			});
			return {
				isError: !result.ok,
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);
}
