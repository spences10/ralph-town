/**
 * MCP Tools Tests
 * Tests for all sandbox MCP tools with mocked CLI execution
 */

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { CLI_FIXTURES, mock_spawn } from './mocks/cli';

// Mock child_process before importing the tools module
const spawn_mock = mock_spawn(CLI_FIXTURES.sandbox_create_success);

mock.module('child_process', () => ({
	spawn: (...args: unknown[]) => spawn_mock(...(args as [string, string[]])),
}));

// Import after mocking
import {
	is_command_allowed,
	sandbox_create_tool,
	sandbox_delete_tool,
	sandbox_env_list_tool,
	sandbox_env_set_tool,
	sandbox_exec_tool,
	sandbox_list_tool,
	sandbox_ssh_tool,
} from '../tools/sandbox';

// Helper to reset mock and configure new response
function reset_mock(
	results: Parameters<typeof mock_spawn>[0] = CLI_FIXTURES.sandbox_create_success,
): ReturnType<typeof mock_spawn> {
	const new_mock = mock_spawn(results);
	mock.module('child_process', () => ({
		spawn: (...args: unknown[]) =>
			new_mock(...(args as [string, string[]])),
	}));
	return new_mock;
}

describe('sandbox_create', () => {
	test('calls CLI with --json flag', async () => {
		const spawn = reset_mock(CLI_FIXTURES.sandbox_create_success);

		const result = await sandbox_create_tool.execute({});

		expect(spawn.calls.length).toBeGreaterThan(0);
		expect(spawn.calls[0].args).toContain('--json');
		expect(spawn.calls[0].args).toContain('sandbox');
		expect(spawn.calls[0].args).toContain('create');
	});

	test('passes --image when provided', async () => {
		const spawn = reset_mock(CLI_FIXTURES.sandbox_create_success);

		await sandbox_create_tool.execute({ image: 'node:20' });

		expect(spawn.calls[0].args).toContain('--image');
		expect(spawn.calls[0].args).toContain('node:20');
	});

	test('passes --name when provided', async () => {
		const spawn = reset_mock(CLI_FIXTURES.sandbox_create_success);

		await sandbox_create_tool.execute({ name: 'my-sandbox' });

		expect(spawn.calls[0].args).toContain('--name');
		expect(spawn.calls[0].args).toContain('my-sandbox');
	});

	test('passes --auto-stop when provided', async () => {
		const spawn = reset_mock(CLI_FIXTURES.sandbox_create_success);

		await sandbox_create_tool.execute({ auto_stop: 30 });

		expect(spawn.calls[0].args).toContain('--auto-stop');
		expect(spawn.calls[0].args).toContain('30');
	});

	test('passes --snapshot when provided', async () => {
		const spawn = reset_mock(CLI_FIXTURES.sandbox_create_success);

		await sandbox_create_tool.execute({ snapshot: 'snapshot-abc' });

		expect(spawn.calls[0].args).toContain('--snapshot');
		expect(spawn.calls[0].args).toContain('snapshot-abc');
	});

	test('passes multiple --env flags when provided', async () => {
		const spawn = reset_mock(CLI_FIXTURES.sandbox_create_success);

		await sandbox_create_tool.execute({ env: ['FOO=bar', 'BAZ=qux'] });

		const args = spawn.calls[0].args;
		const env_indices = args
			.map((a: string, i: number) => (a === '--env' ? i : -1))
			.filter((i: number) => i !== -1);

		expect(env_indices).toHaveLength(2);
		expect(args[env_indices[0] + 1]).toBe('FOO=bar');
		expect(args[env_indices[1] + 1]).toBe('BAZ=qux');
	});

	test('returns parsed JSON on success', async () => {
		reset_mock(CLI_FIXTURES.sandbox_create_success);

		const result = await sandbox_create_tool.execute({});

		expect(result.content[0].type).toBe('text');
		const parsed = JSON.parse((result.content[0] as { text: string }).text);
		expect(parsed.id).toBe('test-sandbox-123');
		expect(parsed.state).toBe('started');
	});

	test('returns error on failure', async () => {
		reset_mock(CLI_FIXTURES.not_found_error);

		const result = await sandbox_create_tool.execute({});

		expect(result.isError).toBe(true);
	});
});

describe('sandbox_list', () => {
	test('calls CLI with --json and --limit', async () => {
		const spawn = reset_mock(CLI_FIXTURES.sandbox_list_success);

		await sandbox_list_tool.execute({ limit: 50 });

		expect(spawn.calls[0].args).toContain('--json');
		expect(spawn.calls[0].args).toContain('--limit');
		expect(spawn.calls[0].args).toContain('50');
		expect(spawn.calls[0].args).toContain('list');
	});

	test('returns list of sandboxes', async () => {
		reset_mock(CLI_FIXTURES.sandbox_list_success);

		const result = await sandbox_list_tool.execute({});

		const parsed = JSON.parse((result.content[0] as { text: string }).text);
		expect(Array.isArray(parsed)).toBe(true);
		expect(parsed).toHaveLength(2);
		expect(parsed[0].id).toBe('sandbox-1');
	});
});

describe('sandbox_ssh', () => {
	test('passes id and --expires', async () => {
		const spawn = reset_mock(CLI_FIXTURES.sandbox_ssh_success);

		await sandbox_ssh_tool.execute({ id: 'sandbox-123', expires: 120 });

		expect(spawn.calls[0].args).toContain('ssh');
		expect(spawn.calls[0].args).toContain('sandbox-123');
		expect(spawn.calls[0].args).toContain('--expires');
		expect(spawn.calls[0].args).toContain('120');
		expect(spawn.calls[0].args).toContain('--json');
	});

	test('returns ssh credentials', async () => {
		reset_mock(CLI_FIXTURES.sandbox_ssh_success);

		const result = await sandbox_ssh_tool.execute({ id: 'sandbox-123' });

		const parsed = JSON.parse((result.content[0] as { text: string }).text);
		expect(parsed.token).toBe('ssh-token-abc');
		expect(parsed.command).toContain('ssh');
	});
});

describe('sandbox_delete', () => {
	test('passes id and --timeout', async () => {
		const spawn = reset_mock(CLI_FIXTURES.sandbox_delete_success);

		await sandbox_delete_tool.execute({ id: 'sandbox-123', timeout: 90 });

		expect(spawn.calls[0].args).toContain('delete');
		expect(spawn.calls[0].args).toContain('sandbox-123');
		expect(spawn.calls[0].args).toContain('--timeout');
		expect(spawn.calls[0].args).toContain('90');
		expect(spawn.calls[0].args).toContain('--json');
	});

	test('returns success on delete', async () => {
		reset_mock(CLI_FIXTURES.sandbox_delete_success);

		const result = await sandbox_delete_tool.execute({ id: 'sandbox-123' });

		const parsed = JSON.parse((result.content[0] as { text: string }).text);
		expect(parsed.deleted).toBe(true);
	});

	test('returns error when sandbox not found', async () => {
		reset_mock(CLI_FIXTURES.not_found_error);

		const result = await sandbox_delete_tool.execute({ id: 'nonexistent' });

		expect(result.isError).toBe(true);
	});
});

describe('sandbox_exec', () => {
	test('allows git commands', async () => {
		const spawn = reset_mock(CLI_FIXTURES.sandbox_exec_success);

		const result = await sandbox_exec_tool.execute({
			id: 'sandbox-123',
			cmd: 'git status',
		});

		expect(result.isError).toBeFalsy();
		expect(spawn.calls[0].args).toContain('exec');
		expect(spawn.calls[0].args).toContain('sandbox-123');
		expect(spawn.calls[0].args).toContain('git status');
	});

	test('blocks disallowed commands', async () => {
		const spawn = reset_mock(CLI_FIXTURES.sandbox_exec_success);

		const result = await sandbox_exec_tool.execute({
			id: 'sandbox-123',
			cmd: 'sudo rm -rf /',
		});

		expect(result.isError).toBe(true);
		expect((result.content[0] as { text: string }).text).toContain(
			'Command not allowed',
		);
		// Should not have called CLI
		expect(spawn.calls).toHaveLength(0);
	});

	test('blocks bash shell invocation', async () => {
		const spawn = reset_mock(CLI_FIXTURES.sandbox_exec_success);

		const result = await sandbox_exec_tool.execute({
			id: 'sandbox-123',
			cmd: 'bash -c "malicious"',
		});

		expect(result.isError).toBe(true);
		expect(spawn.calls).toHaveLength(0);
	});

	test('passes cwd option', async () => {
		const spawn = reset_mock(CLI_FIXTURES.sandbox_exec_success);

		await sandbox_exec_tool.execute({
			id: 'sandbox-123',
			cmd: 'ls -la',
			cwd: '/home/user/project',
		});

		expect(spawn.calls[0].args).toContain('--cwd');
		expect(spawn.calls[0].args).toContain('/home/user/project');
	});

	test('passes timeout option', async () => {
		const spawn = reset_mock(CLI_FIXTURES.sandbox_exec_success);

		await sandbox_exec_tool.execute({
			id: 'sandbox-123',
			cmd: 'npm test',
			timeout: 300,
		});

		expect(spawn.calls[0].args).toContain('--timeout');
		expect(spawn.calls[0].args).toContain('300');
	});
});

describe('sandbox_env_list', () => {
	test('calls sandbox env list --json', async () => {
		const spawn = reset_mock({
			stdout: JSON.stringify({ NODE_ENV: 'development' }),
			exit_code: 0,
		});

		await sandbox_env_list_tool.execute({ id: 'sandbox-123' });

		expect(spawn.calls[0].args).toContain('sandbox');
		expect(spawn.calls[0].args).toContain('env');
		expect(spawn.calls[0].args).toContain('list');
		expect(spawn.calls[0].args).toContain('sandbox-123');
		expect(spawn.calls[0].args).toContain('--json');
	});

	test('returns env vars on success', async () => {
		reset_mock({
			stdout: JSON.stringify({ NODE_ENV: 'development', DEBUG: 'true' }),
			exit_code: 0,
		});

		const result = await sandbox_env_list_tool.execute({ id: 'sandbox-123' });

		const parsed = JSON.parse((result.content[0] as { text: string }).text);
		expect(parsed.NODE_ENV).toBe('development');
		expect(parsed.DEBUG).toBe('true');
	});
});

describe('sandbox_env_set', () => {
	test('passes key and value', async () => {
		const spawn = reset_mock({
			stdout: JSON.stringify({ set: true }),
			exit_code: 0,
		});

		await sandbox_env_set_tool.execute({
			id: 'sandbox-123',
			key: 'MY_VAR',
			value: 'my-value',
		});

		expect(spawn.calls[0].args).toContain('sandbox');
		expect(spawn.calls[0].args).toContain('env');
		expect(spawn.calls[0].args).toContain('set');
		expect(spawn.calls[0].args).toContain('sandbox-123');
		expect(spawn.calls[0].args).toContain('MY_VAR=my-value');
		expect(spawn.calls[0].args).toContain('--json');
	});

	test('handles empty value', async () => {
		const spawn = reset_mock({
			stdout: JSON.stringify({ set: true }),
			exit_code: 0,
		});

		await sandbox_env_set_tool.execute({
			id: 'sandbox-123',
			key: 'EMPTY_VAR',
			value: '',
		});

		expect(spawn.calls[0].args).toContain('EMPTY_VAR=');
	});

	test('returns error on failure', async () => {
		reset_mock(CLI_FIXTURES.not_found_error);

		const result = await sandbox_env_set_tool.execute({
			id: 'nonexistent',
			key: 'VAR',
			value: 'val',
		});

		expect(result.isError).toBe(true);
	});
});
