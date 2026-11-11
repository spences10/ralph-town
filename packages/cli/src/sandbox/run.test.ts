import { DaytonaProcessExecutionTimeoutError } from '@daytona/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { run_sandbox } from './run.js';

const fake = vi.hoisted(() => ({
	create: vi.fn(),
	execute: vi.fn(),
	delete: vi.fn(),
}));
vi.mock('./create.js', () => ({ create_sandbox: fake.create }));

function sandbox() {
	return {
		id: 'sandbox-1',
		delete: fake.delete,
		raw: { process: { executeCommand: fake.execute } },
	};
}

beforeEach(() => {
	vi.resetAllMocks();
	fake.create.mockResolvedValue(sandbox());
	fake.delete.mockResolvedValue(undefined);
	fake.execute.mockImplementation(async (command: string) => {
		const marker = command.match(/(__RALPH_TOWN_\w+__)/)![1];
		return {
			exitCode: 0,
			result: `${marker}EXIT:7\n${marker}STDOUT:b3V0\n${marker}STDERR:ZXJy\n${marker}END\n`,
		};
	});
});

describe('run_sandbox', () => {
	it('preserves separate streams and a nonzero exit while deleting by default', async () => {
		const result = await run_sandbox({
			command: 'example',
			timeout: 45,
			delete_timeout: 90,
		});
		expect(result).toMatchObject({
			exit_code: 7,
			stdout: 'out',
			stderr: 'err',
			timed_out: false,
			deleted: true,
			kept: false,
			cleanup_error: null,
		});
		expect(fake.create).toHaveBeenCalledWith(
			expect.objectContaining({ ephemeral: true }),
		);
		expect(fake.delete).toHaveBeenCalledExactlyOnceWith(90);
		expect(fake.execute).toHaveBeenCalledWith(
			expect.any(String),
			undefined,
			undefined,
			75,
		);
	});

	it('keeps requested sandboxes and disables ephemeral deletion for them', async () => {
		await run_sandbox({ command: 'example', keep: true });
		expect(fake.create).toHaveBeenCalledWith(
			expect.objectContaining({ ephemeral: false }),
		);
		expect(fake.delete).not.toHaveBeenCalled();
	});

	it('does not label a transport error as a command timeout or retry it', async () => {
		fake.execute.mockRejectedValue(new Error('ECONNRESET'));
		const result = await run_sandbox({ command: 'example' });
		expect(result).toMatchObject({
			exit_code: 1,
			timed_out: false,
			stderr: 'ECONNRESET',
			deleted: true,
		});
		expect(fake.execute).toHaveBeenCalledTimes(1);
	});

	it('recognizes a typed execution timeout', async () => {
		fake.execute.mockRejectedValue(
			new DaytonaProcessExecutionTimeoutError('execution timed out'),
		);
		expect(await run_sandbox({ command: 'example' })).toMatchObject({
			exit_code: 124,
			timed_out: true,
			deleted: true,
		});
	});

	it('reports deletion failures instead of claiming cleanup succeeded', async () => {
		fake.delete.mockRejectedValue(new Error('delete failed'));
		expect(await run_sandbox({ command: 'example' })).toMatchObject({
			deleted: false,
			cleanup_error: 'delete failed',
		});
	});

	it('cleans up when cancellation arrives during creation', async () => {
		const controller = new AbortController();
		fake.create.mockImplementation(async () => {
			controller.abort(new Error('cancelled'));
			return sandbox();
		});
		await expect(
			run_sandbox({ command: 'example' }, controller.signal),
		).rejects.toThrow('cancelled');
		expect(fake.execute).not.toHaveBeenCalled();
		expect(fake.delete).toHaveBeenCalledTimes(1);
	});

	it('cleans up on cancellation without waiting for command execution to finish', async () => {
		const controller = new AbortController();
		fake.execute.mockImplementation(() => {
			controller.abort(new Error('cancelled'));
			return new Promise(() => {});
		});
		await expect(
			run_sandbox({ command: 'example' }, controller.signal),
		).rejects.toThrow('cancelled');
		expect(fake.delete).toHaveBeenCalledTimes(1);
	});
});
