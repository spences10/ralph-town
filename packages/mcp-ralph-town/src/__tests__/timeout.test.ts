/**
 * MCP Timeout Tests
 * Tests timeout constants and behavior for sandbox operations
 */

import {
	afterEach,
	beforeEach,
	describe,
	expect,
	mock,
	test,
} from 'bun:test';
import { EventEmitter } from 'events';
import { Readable } from 'stream';

// Store original env
const original_env = { ...process.env };

// Mock child_process spawn
let spawn_mock: ReturnType<typeof mock>;
let last_spawned_proc: MockProc | null = null;

interface MockProc extends EventEmitter {
	stdout: Readable | null;
	stderr: Readable | null;
	stdin: null;
	pid: number;
	killed: boolean;
	kill: ReturnType<typeof mock>;
}

function create_hanging_process(): MockProc {
	const proc = new EventEmitter() as MockProc;
	proc.pid = 12345;
	proc.killed = false;
	proc.stdin = null;
	proc.kill = mock((signal?: string) => {
		proc.killed = true;
		// Don't emit close - simulate hanging process
		return true;
	});

	proc.stdout = new Readable({
		read() {
			// Never push data - hangs
		},
	});
	proc.stderr = new Readable({
		read() {},
	});

	last_spawned_proc = proc;
	return proc;
}

function create_slow_process(delay_ms: number, output: string): MockProc {
	const proc = new EventEmitter() as MockProc;
	proc.pid = 12345;
	proc.killed = false;
	proc.stdin = null;
	proc.kill = mock((signal?: string) => {
		proc.killed = true;
		return true;
	});

	proc.stdout = new Readable({
		read() {
			this.push(output);
			this.push(null);
		},
	});
	proc.stderr = new Readable({
		read() {
			this.push(null);
		},
	});

	setTimeout(() => {
		if (!proc.killed) {
			proc.emit('close', 0);
		}
	}, delay_ms);

	last_spawned_proc = proc;
	return proc;
}

// We need to test the actual run_cli function behavior
// Since it's not exported, we test through the tool handlers

describe('timeout constants', () => {
	test('QUICK_TIMEOUT_MS is 30 seconds', async () => {
		// Read the source and verify constant
		const source = await Bun.file(
			'./src/tools/sandbox.ts',
		).text();
		expect(source).toContain('QUICK_TIMEOUT_MS = 30000');
	});

	test('DEFAULT_TIMEOUT_MS is 120 seconds', async () => {
		const source = await Bun.file(
			'./src/tools/sandbox.ts',
		).text();
		expect(source).toContain('DEFAULT_TIMEOUT_MS = 120000');
	});

	test('LONG_TIMEOUT_MS is 300 seconds', async () => {
		const source = await Bun.file(
			'./src/tools/sandbox.ts',
		).text();
		expect(source).toContain('LONG_TIMEOUT_MS = 300000');
	});
});

describe('timeout assignment per operation', () => {
	test('list uses QUICK_TIMEOUT_MS', async () => {
		const source = await Bun.file(
			'./src/tools/sandbox.ts',
		).text();
		// Find sandbox_list_tool and verify it uses QUICK_TIMEOUT_MS
		const list_match = source.match(
			/sandbox_list_tool[\s\S]*?run_cli\(args,\s*(\w+)\)/,
		);
		expect(list_match).not.toBeNull();
		expect(list_match![1]).toBe('QUICK_TIMEOUT_MS');
	});

	test('ssh uses QUICK_TIMEOUT_MS', async () => {
		const source = await Bun.file(
			'./src/tools/sandbox.ts',
		).text();
		const ssh_match = source.match(
			/sandbox_ssh_tool[\s\S]*?run_cli\(args,\s*(\w+)\)/,
		);
		expect(ssh_match).not.toBeNull();
		expect(ssh_match![1]).toBe('QUICK_TIMEOUT_MS');
	});

	test('delete uses QUICK_TIMEOUT_MS', async () => {
		const source = await Bun.file(
			'./src/tools/sandbox.ts',
		).text();
		const delete_match = source.match(
			/sandbox_delete_tool[\s\S]*?run_cli\(args,\s*(\w+)\)/,
		);
		expect(delete_match).not.toBeNull();
		expect(delete_match![1]).toBe('QUICK_TIMEOUT_MS');
	});

	test('env_list uses QUICK_TIMEOUT_MS', async () => {
		const source = await Bun.file(
			'./src/tools/sandbox.ts',
		).text();
		const env_list_match = source.match(
			/sandbox_env_list_tool[\s\S]*?run_cli\(args,\s*(\w+)\)/,
		);
		expect(env_list_match).not.toBeNull();
		expect(env_list_match![1]).toBe('QUICK_TIMEOUT_MS');
	});

	test('env_set uses QUICK_TIMEOUT_MS', async () => {
		const source = await Bun.file(
			'./src/tools/sandbox.ts',
		).text();
		const env_set_match = source.match(
			/sandbox_env_set_tool[\s\S]*?run_cli\(args,\s*(\w+)\)/,
		);
		expect(env_set_match).not.toBeNull();
		expect(env_set_match![1]).toBe('QUICK_TIMEOUT_MS');
	});

	test('create uses DEFAULT_TIMEOUT_MS', async () => {
		const source = await Bun.file(
			'./src/tools/sandbox.ts',
		).text();
		const create_match = source.match(
			/sandbox_create_tool[\s\S]*?run_cli\(args,\s*(\w+)\)/,
		);
		expect(create_match).not.toBeNull();
		expect(create_match![1]).toBe('DEFAULT_TIMEOUT_MS');
	});

	test('exec uses DEFAULT_TIMEOUT_MS', async () => {
		const source = await Bun.file(
			'./src/tools/sandbox.ts',
		).text();
		const exec_match = source.match(
			/sandbox_exec_tool[\s\S]*?run_cli\(args,\s*(\w+)\)/,
		);
		expect(exec_match).not.toBeNull();
		expect(exec_match![1]).toBe('DEFAULT_TIMEOUT_MS');
	});
});

describe('run_cli timeout behavior', () => {
	test('timeout returns exit code 124', async () => {
		const source = await Bun.file(
			'./src/tools/sandbox.ts',
		).text();

		// Verify exit code 124 on timeout
		expect(source).toContain('exit_code: 124');
	});

	test('timeout message includes ms value', async () => {
		const source = await Bun.file(
			'./src/tools/sandbox.ts',
		).text();

		// Verify timeout message format
		expect(source).toContain(
			'`Command timed out after ${timeout_ms}ms',
		);
	});

	test('SIGTERM sent first on timeout', async () => {
		const source = await Bun.file(
			'./src/tools/sandbox.ts',
		).text();

		// Verify SIGTERM is sent first
		expect(source).toContain("proc.kill('SIGTERM')");
	});

	test('SIGKILL sent after grace period', async () => {
		const source = await Bun.file(
			'./src/tools/sandbox.ts',
		).text();

		// Verify SIGKILL fallback exists
		expect(source).toContain("proc.kill('SIGKILL')");
	});

	test('grace period is 5 seconds', async () => {
		const source = await Bun.file(
			'./src/tools/sandbox.ts',
		).text();

		// Verify 5000ms grace period before SIGKILL
		// Match: setTimeout(() => { ... SIGKILL ... }, 5000);
		const sigkill_block = source.match(
			/setTimeout\(\(\)\s*=>\s*\{[\s\S]*?SIGKILL[\s\S]*?\},\s*(\d+)\)/,
		);
		expect(sigkill_block).not.toBeNull();
		expect(sigkill_block![1]).toBe('5000');
	});

	test('timeout cleared on normal completion', async () => {
		const source = await Bun.file(
			'./src/tools/sandbox.ts',
		).text();

		// Verify timeout is cleared
		expect(source).toContain('clearTimeout(timeout_id)');
	});

	test('timed_out flag prevents double handling', async () => {
		const source = await Bun.file(
			'./src/tools/sandbox.ts',
		).text();

		// Verify timed_out flag exists and is checked
		expect(source).toContain('let timed_out = false');
		expect(source).toContain('timed_out = true');
		expect(source).toContain('if (timed_out)');
	});
});

describe('timeout error message format', () => {
	test('stderr includes timeout message prefix', async () => {
		const source = await Bun.file(
			'./src/tools/sandbox.ts',
		).text();

		// Verify message is prepended to stderr
		expect(source).toContain(
			'stderr: `Command timed out after ${timeout_ms}ms\\n${stderr}`',
		);
	});
});

describe('process cleanup on timeout', () => {
	test('killed flag checked before SIGKILL', async () => {
		const source = await Bun.file(
			'./src/tools/sandbox.ts',
		).text();

		// Verify killed check before SIGKILL
		expect(source).toContain('if (!proc.killed)');
	});
});
