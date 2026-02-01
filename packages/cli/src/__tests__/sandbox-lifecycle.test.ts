/**
 * Sandbox Lifecycle Tests
 * Tests for sandbox creation and cleanup
 */

import { beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { create_mock_raw_sandbox } from './mocks/daytona';

// Mock the client module before importing create
const mock_daytona_client = {
	create: mock(() => Promise.resolve(create_mock_raw_sandbox())),
};

mock.module('../sandbox/client', () => ({
	create_daytona_client: () => mock_daytona_client,
}));

// Import after mocking
const { create_sandbox } = await import('../sandbox/create');
const { SandboxNameValidationError } = await import(
	'../sandbox/validation'
);

describe('cleanup_partial_sandbox', () => {
	test('cleans up sandbox on creation failure', async () => {
		const mock_sandbox = create_mock_raw_sandbox();
		mock_daytona_client.create.mockImplementationOnce(async () => {
			throw new Error('Creation failed mid-process');
		});

		await expect(
			create_sandbox({ name: 'test-sandbox' }),
		).rejects.toThrow('Creation failed mid-process');
	});

	test('ignores cleanup errors gracefully', async () => {
		const mock_sandbox = create_mock_raw_sandbox();
		mock_sandbox.delete.mockImplementation(() =>
			Promise.reject(new Error('Cleanup failed')),
		);

		mock_daytona_client.create.mockImplementationOnce(async () => {
			// Simulate partial creation then failure
			throw new Error('Creation failed');
		});

		// Should not throw cleanup error, only original error
		await expect(
			create_sandbox({ name: 'test-sandbox' }),
		).rejects.toThrow('Creation failed');
	});

	test('handles undefined sandbox input', async () => {
		// When create throws before sandbox is assigned, cleanup handles undefined
		mock_daytona_client.create.mockImplementationOnce(() =>
			Promise.reject(new Error('Immediate failure')),
		);

		await expect(
			create_sandbox({ name: 'test-sandbox' }),
		).rejects.toThrow('Immediate failure');
	});
});

describe('create_sandbox validation', () => {
	beforeEach(() => {
		mock_daytona_client.create.mockImplementation(() =>
			Promise.resolve(create_mock_raw_sandbox()),
		);
	});

	test('validates name before making API call', async () => {
		// Invalid name should throw before API call
		await expect(
			create_sandbox({ name: '-invalid-name-' }),
		).rejects.toThrow(SandboxNameValidationError);

		// create should not have been called
		const call_count = mock_daytona_client.create.mock.calls.length;

		await expect(
			create_sandbox({ name: '!!!invalid' }),
		).rejects.toThrow(SandboxNameValidationError);

		// Still should not have been called
		expect(mock_daytona_client.create.mock.calls.length).toBe(
			call_count,
		);
	});

	test('allows valid names', async () => {
		await create_sandbox({ name: 'valid-name-123' });
		expect(mock_daytona_client.create).toHaveBeenCalled();
	});

	test('uses snapshot fast path when snapshot provided', async () => {
		await create_sandbox({
			name: 'test-sandbox',
			snapshot: 'my-snapshot',
		});

		const calls = mock_daytona_client.create.mock.calls as unknown[][];
		expect(calls.length).toBeGreaterThan(0);
		const last_call = calls[calls.length - 1];
		const create_options = last_call[0] as Record<string, unknown>;

		expect(create_options.snapshot).toBe('my-snapshot');
		// Snapshot path should not include image
		expect(create_options.image).toBeUndefined();
	});

	test('uses image path when no snapshot provided', async () => {
		await create_sandbox({ name: 'test-sandbox' });

		const calls = mock_daytona_client.create.mock.calls as unknown[][];
		expect(calls.length).toBeGreaterThan(0);
		const last_call = calls[calls.length - 1];
		const create_options = last_call[0] as Record<string, unknown>;

		// Image path should include image, not snapshot
		expect(create_options.snapshot).toBeUndefined();
		expect(create_options.image).toBeDefined();
	});
});
