import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	SandboxNotFoundError,
	SdkError,
	is_sandbox_not_found,
	is_transient_error,
	output_error,
	with_retry,
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

	it('detects transient network errors', () => {
		for (const message of ['ECONNRESET', 'ETIMEDOUT', 'HTTP 503']) {
			expect(is_transient_error(new Error(message))).toBe(true);
		}
		expect(is_transient_error(new Error('invalid request'))).toBe(
			false,
		);
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

describe('with_retry', () => {
	it('retries transient failures and returns the successful result', async () => {
		let attempts = 0;
		const fn = vi.fn(async () => {
			attempts++;
			if (attempts < 2) throw new Error('ECONNRESET');
			return 'ok';
		});

		await expect(with_retry(fn, 2, 1)).resolves.toBe('ok');
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('does not retry non-transient failures', async () => {
		const fn = vi.fn(async () => {
			throw new Error('invalid request');
		});

		await expect(with_retry(fn, 3, 1)).rejects.toThrow(
			'invalid request',
		);
		expect(fn).toHaveBeenCalledTimes(1);
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
