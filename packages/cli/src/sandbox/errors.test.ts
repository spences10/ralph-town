import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	SandboxNotFoundError,
	SdkError,
	is_sandbox_not_found,
	output_error,
	wrap_sdk_call,
} from './errors.js';

describe('SandboxNotFoundError', () => {
	it('serializes to the CLI error shape', () => {
		const error = new SandboxNotFoundError('sandbox-123');
		expect(error.toCliError()).toEqual({
			error: true,
			code: 'SANDBOX_NOT_FOUND',
			message: 'Sandbox not found: sandbox-123',
		});
	});
});

describe('SdkError', () => {
	it('wraps unknown thrown values', () => {
		const error = SdkError.from('boom');
		expect(error.message).toBe('boom');
		expect(error.originalError).toBe('boom');
	});
});

describe('error classification', () => {
	it('detects not-found SDK errors', () => {
		expect(is_sandbox_not_found(new Error('HTTP 404'))).toBe(true);
		expect(is_sandbox_not_found(new Error('does not exist'))).toBe(
			true,
		);
		expect(is_sandbox_not_found(new Error('timeout'))).toBe(false);
		expect(is_sandbox_not_found('not found')).toBe(false);
	});
});

describe('output_error', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		process.exitCode = 0;
	});

	it('writes JSON errors when json mode is enabled', () => {
		const spy = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);

		output_error(new SandboxNotFoundError('abc'), true);

		expect(spy).toHaveBeenCalledWith(
			'{"error":true,"code":"SANDBOX_NOT_FOUND","message":"Sandbox not found: abc"}',
		);
		expect(process.exitCode).toBe(1);
	});

	it('writes human-readable errors by default', () => {
		const spy = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);

		output_error(new SdkError('failed'), false);

		expect(spy).toHaveBeenCalledWith('Error: failed');
	});
});

describe('wrap_sdk_call', () => {
	it('converts sandbox misses into SandboxNotFoundError', async () => {
		await expect(
			wrap_sdk_call(
				() => Promise.reject(new Error('not found')),
				'sandbox-123',
			),
		).rejects.toThrow(SandboxNotFoundError);
	});
});
