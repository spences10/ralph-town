/**
 * Mock factories for Daytona SDK types
 * Provides test doubles for Sandbox and Daytona client
 */

import { mock, spyOn } from 'bun:test';
import type {
	ExecuteResult,
	ISandbox,
	SandboxSummary,
	SshAccess,
} from '../../sandbox/types';

/**
 * Options for creating a mock sandbox
 */
export interface MockSandboxOptions {
	id?: string;
	state?: string;
	work_dir?: string;
	home_dir?: string;
}

/**
 * Mock sandbox with spied methods
 */
export interface MockSandbox extends ISandbox {
	get_ssh_access: ReturnType<typeof mock>;
	execute: ReturnType<typeof mock>;
	upload_file: ReturnType<typeof mock>;
	download_file: ReturnType<typeof mock>;
	delete: ReturnType<typeof mock>;
	get_work_dir: ReturnType<typeof mock>;
	get_home_dir: ReturnType<typeof mock>;
}

/**
 * Create a mock Sandbox with spied methods
 */
export function create_mock_sandbox(
	options: MockSandboxOptions = {},
): MockSandbox {
	const {
		id = 'mock-sandbox-123',
		state = 'started',
		work_dir = '/workspaces/project',
		home_dir = '/home/daytona',
	} = options;

	const default_ssh_access: SshAccess = {
		token: 'mock-ssh-token',
		command: `ssh -o StrictHostKeyChecking=no user@sandbox.example.com`,
		expires_at: new Date(Date.now() + 3600000),
	};

	const default_execute_result: ExecuteResult = {
		stdout: '',
		stderr: '',
		exit_code: 0,
	};

	return {
		id,
		state,
		get_ssh_access: mock(() => Promise.resolve(default_ssh_access)),
		execute: mock(() => Promise.resolve(default_execute_result)),
		upload_file: mock(() => Promise.resolve()),
		download_file: mock(() => Promise.resolve(Buffer.from(''))),
		delete: mock(() => Promise.resolve()),
		get_work_dir: mock(() => Promise.resolve(work_dir)),
		get_home_dir: mock(() => Promise.resolve(home_dir)),
	};
}

/**
 * Mock Daytona client interface
 */
export interface MockDaytona {
	create: ReturnType<typeof mock>;
	get: ReturnType<typeof mock>;
	list: ReturnType<typeof mock>;
	delete: ReturnType<typeof mock>;
}

/**
 * Create a mock Daytona client with spied methods
 */
export function create_mock_daytona(
	default_sandbox?: MockSandbox,
): MockDaytona {
	const sandbox = default_sandbox ?? create_mock_sandbox();

	const default_list: SandboxSummary[] = [
		{ id: sandbox.id, state: sandbox.state ?? 'started' },
	];

	return {
		create: mock(() => Promise.resolve(sandbox)),
		get: mock(() => Promise.resolve(sandbox)),
		list: mock(() => Promise.resolve(default_list)),
		delete: mock(() => Promise.resolve()),
	};
}

/**
 * Create mock for SDK's raw Sandbox object (DaytonaSandbox)
 * Use when testing code that interacts directly with SDK types
 */
export function create_mock_raw_sandbox(
	options: MockSandboxOptions = {},
) {
	const {
		id = 'mock-sandbox-123',
		state = 'started',
		work_dir = '/workspaces/project',
		home_dir = '/home/daytona',
	} = options;

	return {
		id,
		state,
		createSshAccess: mock(() =>
			Promise.resolve({
				token: 'mock-ssh-token',
				sshCommand: 'ssh user@sandbox.example.com',
				expiresAt: new Date(Date.now() + 3600000).toISOString(),
			}),
		),
		process: {
			executeCommand: mock(() =>
				Promise.resolve({
					result: '',
					exitCode: 0,
				}),
			),
		},
		fs: {
			uploadFile: mock(() => Promise.resolve()),
			downloadFile: mock(() => Promise.resolve(new Uint8Array())),
		},
		delete: mock(() => Promise.resolve()),
		getWorkDir: mock(() => Promise.resolve(work_dir)),
		getUserHomeDir: mock(() => Promise.resolve(home_dir)),
	};
}
