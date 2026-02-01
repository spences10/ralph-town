/**
 * Tests for CLI mock factories
 */

import { describe, expect, test } from 'bun:test';
import {
	CLI_FIXTURES,
	create_mock_child_process,
	mock_spawn,
} from './cli';

describe('create_mock_child_process', () => {
	test('emits stdout data', async () => {
		const proc = create_mock_child_process({ stdout: 'hello' });
		let output = '';
		proc.stdout?.on('data', (chunk) => {
			output += chunk.toString();
		});
		await new Promise((r) => proc.stdout?.on('end', r));
		expect(output).toBe('hello');
	});

	test('emits close event with exit code', async () => {
		const proc = create_mock_child_process({ exit_code: 42 });
		const code = await new Promise((r) => proc.on('close', r));
		expect(code).toBe(42);
	});

	test('emits error on spawn_error', async () => {
		const err = new Error('ENOENT');
		const proc = create_mock_child_process({ spawn_error: err });
		const error = await new Promise((r) => proc.on('error', r));
		expect(error).toBe(err);
	});

	test('kill method works', () => {
		const proc = create_mock_child_process();
		expect(proc.killed).toBe(false);
		proc.kill('SIGTERM');
		expect(proc.killed).toBe(true);
		expect(proc.kill).toHaveBeenCalledWith('SIGTERM');
	});
});

describe('mock_spawn', () => {
	test('returns mock function', () => {
		const spawn = mock_spawn();
		expect(typeof spawn).toBe('function');
	});

	test('tracks calls', () => {
		const spawn = mock_spawn();
		spawn('node', ['script.js']);
		spawn('bun', ['test']);
		expect(spawn.calls).toHaveLength(2);
		expect(spawn.calls[0]).toEqual({
			command: 'node',
			args: ['script.js'],
		});
	});

	test('uses single result for all calls', async () => {
		const spawn = mock_spawn({ exit_code: 0 });
		const proc1 = spawn('cmd1', []);
		const proc2 = spawn('cmd2', []);

		const code1 = await new Promise((r) => proc1.on('close', r));
		const code2 = await new Promise((r) => proc2.on('close', r));

		expect(code1).toBe(0);
		expect(code2).toBe(0);
	});

	test('uses array of results in order', async () => {
		const spawn = mock_spawn([
			{ exit_code: 0 },
			{ exit_code: 1 },
		]);

		const proc1 = spawn('cmd1', []);
		const proc2 = spawn('cmd2', []);

		const code1 = await new Promise((r) => proc1.on('close', r));
		const code2 = await new Promise((r) => proc2.on('close', r));

		expect(code1).toBe(0);
		expect(code2).toBe(1);
	});
});

describe('CLI_FIXTURES', () => {
	test('sandbox_create_success has valid JSON', () => {
		const parsed = JSON.parse(CLI_FIXTURES.sandbox_create_success.stdout);
		expect(parsed.id).toBe('test-sandbox-123');
		expect(parsed.state).toBe('started');
	});

	test('sandbox_list_success has array', () => {
		const parsed = JSON.parse(CLI_FIXTURES.sandbox_list_success.stdout);
		expect(Array.isArray(parsed)).toBe(true);
		expect(parsed).toHaveLength(2);
	});

	test('not_found_error has error format', () => {
		const parsed = JSON.parse(CLI_FIXTURES.not_found_error.stderr);
		expect(parsed.error).toBe(true);
		expect(parsed.code).toBe('SANDBOX_NOT_FOUND');
	});
});
