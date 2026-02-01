/**
 * Mock factories for CLI execution tests
 * Provides test doubles for child_process.spawn
 */

import { mock } from 'bun:test';
import type { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { Readable } from 'stream';

/**
 * Mock spawn result configuration
 */
export interface MockSpawnResult {
	stdout?: string;
	stderr?: string;
	exit_code?: number;
	/** Delay before emitting close event (ms) */
	delay?: number;
	/** Simulate spawn error (e.g., ENOENT) */
	spawn_error?: Error;
}

/**
 * Mock ChildProcess with controllable streams
 */
export interface MockChildProcess extends EventEmitter {
	stdout: Readable | null;
	stderr: Readable | null;
	stdin: null;
	pid: number;
	killed: boolean;
	kill: ReturnType<typeof mock>;
}

/**
 * Create a mock ChildProcess that emits configured output
 */
export function create_mock_child_process(
	result: MockSpawnResult = {},
): MockChildProcess {
	const {
		stdout = '',
		stderr = '',
		exit_code = 0,
		delay = 0,
		spawn_error,
	} = result;

	const proc = new EventEmitter() as MockChildProcess;

	proc.pid = 12345;
	proc.killed = false;
	proc.stdin = null;
	proc.kill = mock((signal?: string) => {
		proc.killed = true;
		return true;
	});

	// Create readable streams for stdout/stderr
	proc.stdout = new Readable({
		read() {
			this.push(stdout);
			this.push(null);
		},
	});

	proc.stderr = new Readable({
		read() {
			this.push(stderr);
			this.push(null);
		},
	});

	// Schedule close event
	if (spawn_error) {
		setImmediate(() => {
			proc.emit('error', spawn_error);
		});
	} else {
		setTimeout(() => {
			proc.emit('close', exit_code);
		}, delay);
	}

	return proc;
}

/**
 * Create a mock spawn function that returns configured results
 *
 * @param results - Array of results to return for each call, or single result for all calls
 * @returns Mock spawn function with call tracking
 */
export function mock_spawn(
	results: MockSpawnResult | MockSpawnResult[] = {},
): ReturnType<typeof mock> & {
	calls: Array<{ command: string; args: string[] }>;
} {
	const results_array = Array.isArray(results) ? results : [results];
	let call_index = 0;

	const spawn_mock = mock(
		(command: string, args: string[] = []) => {
			const result = results_array[
				Math.min(call_index, results_array.length - 1)
			];
			call_index++;

			spawn_mock.calls.push({ command, args });
			return create_mock_child_process(result);
		},
	) as ReturnType<typeof mock> & {
		calls: Array<{ command: string; args: string[] }>;
	};

	spawn_mock.calls = [];

	return spawn_mock;
}

/**
 * Common CLI response fixtures
 */
export const CLI_FIXTURES = {
	sandbox_create_success: {
		stdout: JSON.stringify({
			id: 'test-sandbox-123',
			state: 'started',
		}),
		stderr: '',
		exit_code: 0,
	},

	sandbox_list_success: {
		stdout: JSON.stringify([
			{ id: 'sandbox-1', state: 'started' },
			{ id: 'sandbox-2', state: 'stopped' },
		]),
		stderr: '',
		exit_code: 0,
	},

	sandbox_ssh_success: {
		stdout: JSON.stringify({
			token: 'ssh-token-abc',
			command: 'ssh user@sandbox.example.com',
			expires_at: new Date(Date.now() + 3600000).toISOString(),
		}),
		stderr: '',
		exit_code: 0,
	},

	sandbox_delete_success: {
		stdout: JSON.stringify({ deleted: true, id: 'test-sandbox-123' }),
		stderr: '',
		exit_code: 0,
	},

	sandbox_exec_success: {
		stdout: JSON.stringify({
			stdout: 'command output',
			stderr: '',
			exit_code: 0,
		}),
		stderr: '',
		exit_code: 0,
	},

	not_found_error: {
		stdout: '',
		stderr: JSON.stringify({
			error: true,
			code: 'SANDBOX_NOT_FOUND',
			message: 'Sandbox not found: test-sandbox-123',
		}),
		exit_code: 1,
	},

	timeout_error: {
		stdout: '',
		stderr: 'Command timed out after 30000ms',
		exit_code: 124,
	},
} as const;
