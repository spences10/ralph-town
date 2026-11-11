import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';
import { create_codemode_tools, execute_code } from './codemode.js';
import { create_server } from './server.js';

const operations = vi.hoisted(() => ({
	create_sandbox: vi.fn(),
	run_sandbox: vi.fn(),
	list_sandboxes: vi.fn(),
	delete_sandbox: vi.fn(),
	exec_sandbox: vi.fn(),
	get_ssh_access: vi.fn(),
	list_sandbox_env: vi.fn(),
	set_sandbox_env: vi.fn(),
}));
vi.mock('ralph-town/operations', async (import_original) => ({
	...(await import_original<
		typeof import('ralph-town/operations')
	>()),
	...operations,
}));

const meta = {
	'io.modelcontextprotocol/protocolVersion': '2026-07-28',
	'io.modelcontextprotocol/clientCapabilities': {},
	'io.modelcontextprotocol/clientInfo': {
		name: 'test',
		version: '1',
	},
};

async function request(
	method: string,
	params: Record<string, unknown> = {},
) {
	const response = await create_server().receive({
		jsonrpc: '2.0',
		id: 1,
		method,
		params: { ...params, _meta: meta },
	});
	if (!response || !('result' in response))
		throw new Error(JSON.stringify(response));
	return response.result as {
		isError?: boolean;
		content: { type: string; text: string }[];
		tools: { name: string }[];
	};
}

async function call(name: string, args: Record<string, unknown>) {
	return request('tools/call', { name, arguments: args });
}

beforeEach(() => {
	vi.resetAllMocks();
	vi.spyOn(console, 'error').mockImplementation(() => {});
	operations.list_sandboxes.mockResolvedValue([
		{ id: 'one', state: 'started' },
	]);
	operations.run_sandbox.mockImplementation(async (options) => ({
		sandbox_id: 'one',
		exit_code: options.command === 'false' ? 7 : 0,
		stdout: 'output',
		stderr: '',
		cleanup_error: null,
		deleted: true,
	}));
});

afterEach(() => vi.restoreAllMocks());

describe('Code Mode MCP', () => {
	it('keeps direct tools alongside search and execute', async () => {
		const result = await request('tools/list');
		expect(result.tools.map(({ name }) => name).sort()).toEqual([
			'execute',
			'sandbox_create',
			'sandbox_delete',
			'sandbox_env_list',
			'sandbox_env_set',
			'sandbox_exec',
			'sandbox_list',
			'sandbox_run',
			'sandbox_ssh',
			'search',
		]);
	});

	it('discovers signatures from the same schemas used for validation', async () => {
		const result = await call('search', { query: 'sandbox_run' });
		const matches = JSON.parse(result.content[0].text);
		expect(matches).toHaveLength(1);
		expect(matches[0].declaration).toContain('command: string');
		expect(matches[0].declaration).toContain('keep?: boolean');
		expect(matches[0].declaration).not.toContain('ephemeral');
	});

	it('orchestrates multiple runs and returns only the selected results', async () => {
		const response = await call('execute', {
			code: "const results = await Promise.all(['true', 'false'].map(command => tools.sandbox_run({ command }))); return results.map(r => r.exit_code);",
		});
		expect(response.isError).toBe(false);
		expect(JSON.parse(response.content[0].text)).toMatchObject({
			ok: true,
			value: [0, 7],
		});
		expect(operations.run_sandbox).toHaveBeenCalledTimes(2);
	});

	it('uses shared operations directly and preserves direct-tool error responses', async () => {
		const result = await call('sandbox_run', { command: 'false' });
		expect(result.isError).toBe(true);
		expect(JSON.parse(result.content[0].text)).toMatchObject({
			exit_code: 7,
			deleted: true,
		});
		expect(operations.run_sandbox).toHaveBeenCalledTimes(1);
	});

	it('rejects invalid nested arguments before reaching Daytona', async () => {
		const response = await call('execute', {
			code: 'return await tools.sandbox_delete({});',
		});
		expect(response.isError).toBe(true);
		expect(operations.delete_sandbox).not.toHaveBeenCalled();
	});

	it('applies the existing command filter in Code Mode too', async () => {
		const response = await call('execute', {
			code: "return await tools.sandbox_exec({id: 'one', cmd: 'bash -c id'});",
		});
		expect(response.isError).toBe(true);
		expect(operations.exec_sandbox).not.toHaveBeenCalled();
	});

	it('normalizes explicit sandbox credentials without forwarding the host environment', async () => {
		await call('sandbox_run', {
			command: 'true',
			env: ['MESSAGE=one,two=three', 'SANDBOX_GH_TOKEN=test-value'],
		});
		expect(operations.run_sandbox).toHaveBeenCalledWith(
			expect.objectContaining({
				env_vars: {
					MESSAGE: 'one,two=three',
					GH_TOKEN: 'test-value',
				},
			}),
			undefined,
		);
	});

	it('reports host failures as execution errors', async () => {
		operations.list_sandboxes.mockRejectedValue(
			new Error('provider unavailable'),
		);
		const response = await call('execute', {
			code: 'return await tools.sandbox_list({});',
		});
		expect(response.isError).toBe(true);
		expect(
			JSON.parse(response.content[0].text).error.message,
		).toContain('provider unavailable');
	});
});

describe('QuickJS execution', () => {
	it('exposes no Node or network globals', async () => {
		const result = await execute_code(
			'return [typeof process, typeof require, typeof fetch];',
			[],
		);
		expect(result).toMatchObject({
			ok: true,
			value: ['undefined', 'undefined', 'undefined'],
		});
	});

	it('stops a non-yielding script at its deadline', async () => {
		const result = await execute_code('while (true) {}', [], {
			timeout_ms: 50,
		});
		expect(result).toMatchObject({
			ok: false,
			error: { kind: 'timeout' },
		});
	});

	it('does not persist script state between calls', async () => {
		expect(
			await execute_code("store('id', 'one');", []),
		).toMatchObject({ ok: true });
		expect(
			await execute_code("return load('id') ?? null;", []),
		).toMatchObject({ ok: true, value: null });
	});

	it('passes cancellation to host operations', async () => {
		const controller = new AbortController();
		let host_signal: AbortSignal | undefined;
		operations.run_sandbox.mockImplementation((_options, signal) => {
			host_signal = signal;
			controller.abort();
			return new Promise(() => {});
		});
		const result = await execute_code(
			"return await tools.sandbox_run({command: 'true'});",
			await create_codemode_tools(),
			{ signal: controller.signal },
		);
		expect(result).toMatchObject({
			ok: false,
			error: { kind: 'aborted' },
		});
		expect(host_signal?.aborted).toBe(true);
	});
});
