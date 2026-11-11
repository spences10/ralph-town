import { DaytonaTimeoutError } from '@daytona/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { create_sandbox } from './create.js';

const sdk = vi.hoisted(() => ({
	create: vi.fn(),
	get: vi.fn(),
	delete: vi.fn(),
}));
vi.mock('./client.js', () => ({ create_daytona_client: () => sdk }));

beforeEach(() => {
	vi.resetAllMocks();
	sdk.create.mockResolvedValue({ id: 'sandbox-1', state: 'started' });
	sdk.get.mockResolvedValue({ delete: sdk.delete });
	sdk.delete.mockResolvedValue(undefined);
});

describe('create_sandbox', () => {
	it('passes snapshot, lifecycle and environment options to the renamed SDK', async () => {
		const sandbox = await create_sandbox({
			snapshot: 'test-snapshot',
			ephemeral: true,
			auto_stop_interval: 5,
			env_vars: { NODE_ENV: 'test' },
			timeout: 42,
		});
		expect(sandbox.id).toBe('sandbox-1');
		expect(sdk.create).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				snapshot: 'test-snapshot',
				ephemeral: true,
				autoStopInterval: 5,
				envVars: { NODE_ENV: 'test' },
			}),
			expect.objectContaining({ timeout: 42 }),
		);
	});

	it('does not retry creation after an uncertain network failure', async () => {
		sdk.create.mockRejectedValue(new Error('ECONNRESET'));
		await expect(
			create_sandbox({ image: 'node:22' }),
		).rejects.toThrow('ECONNRESET');
		expect(sdk.create).toHaveBeenCalledTimes(1);
	});

	it('deletes the partial sandbox reported by a creation timeout', async () => {
		const error = new DaytonaTimeoutError('creation timed out');
		error.sandboxId = 'partial-1';
		sdk.create.mockRejectedValue(error);
		await expect(create_sandbox({ snapshot: 'test' })).rejects.toBe(
			error,
		);
		expect(sdk.get).toHaveBeenCalledWith('partial-1');
		expect(sdk.delete).toHaveBeenCalledWith(30);
		expect(sdk.create).toHaveBeenCalledTimes(1);
	});

	it('reports failed partial cleanup with the sandbox ID', async () => {
		const error = new DaytonaTimeoutError('creation timed out');
		error.sandboxId = 'partial-1';
		sdk.create.mockRejectedValue(error);
		sdk.delete.mockRejectedValue(new Error('delete unavailable'));
		await expect(
			create_sandbox({ snapshot: 'test' }),
		).rejects.toThrow('cleanup failed for partial-1');
	});
});
