import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	delete_sandbox,
	exec_sandbox,
	list_sandbox_env,
	list_sandboxes,
	set_sandbox_env,
} from './operations.js';

const sdk = vi.hoisted(() => ({
	get: vi.fn(),
	list: vi.fn(),
	execute: vi.fn(),
	update_env: vi.fn(),
	delete: vi.fn(),
}));
vi.mock('./sandbox/client.js', async (import_original) => ({
	...(await import_original<typeof import('./sandbox/client.js')>()),
	create_daytona_client: () => sdk,
}));

beforeEach(() => {
	vi.resetAllMocks();
	sdk.get.mockResolvedValue({
		process: { executeCommand: sdk.execute },
		updateEnv: sdk.update_env,
		delete: sdk.delete,
	});
	sdk.execute.mockResolvedValue({ exitCode: 0, result: 'ok' });
});

describe('shared operations', () => {
	it('uses updateEnv without constructing shell commands', async () => {
		await set_sandbox_env(
			'sandbox-1',
			'MESSAGE',
			'hello = world\nsecond line',
		);
		expect(sdk.update_env).toHaveBeenCalledExactlyOnceWith({
			MESSAGE: 'hello = world\nsecond line',
		});
		expect(sdk.execute).not.toHaveBeenCalled();
	});

	it('reads the current daemon environment, preserving newlines and equals signs', async () => {
		sdk.execute.mockResolvedValue({
			exitCode: 0,
			result: 'MESSAGE=hello=world\nsecond line\0EMPTY=\0',
		});
		await expect(list_sandbox_env('sandbox-1')).resolves.toEqual({
			MESSAGE: 'hello=world\nsecond line',
			EMPTY: '',
		});
		expect(sdk.execute).toHaveBeenCalledWith(
			'printenv -0',
			undefined,
			undefined,
			120,
		);
	});

	it('returns command failures as structured data and forwards timeouts', async () => {
		sdk.execute.mockResolvedValue({ exitCode: 7, result: 'failed' });
		await expect(
			exec_sandbox('sandbox-1', 'false', '/work', 300),
		).resolves.toEqual({ exit_code: 7, stdout: 'failed' });
		expect(sdk.execute).toHaveBeenCalledExactlyOnceWith(
			'false',
			'/work',
			undefined,
			300,
		);
	});

	it('does not retry commands after a network failure', async () => {
		sdk.execute.mockRejectedValue(new Error('socket hang up'));
		await expect(
			exec_sandbox('sandbox-1', 'echo test'),
		).rejects.toThrow('socket hang up');
		expect(sdk.execute).toHaveBeenCalledTimes(1);
	});

	it('limits listing without exposing SDK instances', async () => {
		sdk.list.mockImplementation(async function* () {
			yield { id: 'one', state: 'started', internal: true };
			yield { id: 'two', state: 'stopped' };
		});
		await expect(list_sandboxes(1)).resolves.toEqual([
			{ id: 'one', state: 'started' },
		]);
	});

	it('forwards deletion timeouts without an outer subprocess deadline', async () => {
		await expect(delete_sandbox('sandbox-1', 90)).resolves.toEqual({
			deleted: true,
			id: 'sandbox-1',
		});
		expect(sdk.delete).toHaveBeenCalledWith(90);
	});
});
