import { describe, expect, spyOn, test } from 'bun:test';
import {
	SandboxNotFoundError,
	SdkError,
	output_error,
	is_sandbox_not_found,
	wrap_sdk_call,
} from '../sandbox/errors';

describe('SandboxNotFoundError', () => {
	test('has correct code', () => {
		const error = new SandboxNotFoundError('abc123');
		expect(error.code).toBe('SANDBOX_NOT_FOUND');
	});

	test('has correct message with id', () => {
		const error = new SandboxNotFoundError('abc123');
		expect(error.message).toBe('Sandbox not found: abc123');
	});

	test('has correct name', () => {
		const error = new SandboxNotFoundError('abc123');
		expect(error.name).toBe('SandboxNotFoundError');
	});

	test('toCliError returns proper format', () => {
		const error = new SandboxNotFoundError('abc123');
		expect(error.toCliError()).toEqual({
			error: true,
			code: 'SANDBOX_NOT_FOUND',
			message: 'Sandbox not found: abc123',
		});
	});
});

describe('SdkError', () => {
	test('has correct code', () => {
		const error = new SdkError('Something failed');
		expect(error.code).toBe('SDK_ERROR');
	});

	test('has correct name', () => {
		const error = new SdkError('Something failed');
		expect(error.name).toBe('SdkError');
	});

	test('stores original error', () => {
		const original = new Error('original');
		const error = new SdkError('wrapped', original);
		expect(error.originalError).toBe(original);
	});

	test('from() wraps Error instance', () => {
		const original = new Error('original message');
		const error = SdkError.from(original);
		expect(error.message).toBe('original message');
		expect(error.originalError).toBe(original);
	});

	test('from() wraps string', () => {
		const error = SdkError.from('string error');
		expect(error.message).toBe('string error');
		expect(error.originalError).toBe('string error');
	});

	test('from() wraps unknown types', () => {
		const error = SdkError.from(42);
		expect(error.message).toBe('42');
		expect(error.originalError).toBe(42);
	});

	test('from() wraps null', () => {
		const error = SdkError.from(null);
		expect(error.message).toBe('null');
		expect(error.originalError).toBe(null);
	});

	test('toCliError returns proper format', () => {
		const error = new SdkError('API failed');
		expect(error.toCliError()).toEqual({
			error: true,
			code: 'SDK_ERROR',
			message: 'API failed',
		});
	});
});

describe('is_sandbox_not_found', () => {
	test('detects "not found" message', () => {
		const error = new Error('Sandbox not found');
		expect(is_sandbox_not_found(error)).toBe(true);
	});

	test('detects "does not exist" message', () => {
		const error = new Error('Resource does not exist');
		expect(is_sandbox_not_found(error)).toBe(true);
	});

	test('detects "404" message', () => {
		const error = new Error('HTTP 404: Not Found');
		expect(is_sandbox_not_found(error)).toBe(true);
	});

	test('is case insensitive', () => {
		expect(is_sandbox_not_found(new Error('NOT FOUND'))).toBe(true);
		expect(is_sandbox_not_found(new Error('Does Not Exist'))).toBe(
			true,
		);
	});

	test('returns false for other errors', () => {
		expect(is_sandbox_not_found(new Error('Connection failed'))).toBe(
			false,
		);
		expect(is_sandbox_not_found(new Error('Timeout'))).toBe(false);
	});

	test('returns false for non-Error types', () => {
		expect(is_sandbox_not_found('not found')).toBe(false);
		expect(is_sandbox_not_found(null)).toBe(false);
		expect(is_sandbox_not_found(undefined)).toBe(false);
		expect(is_sandbox_not_found(404)).toBe(false);
	});
});

describe('output_error', () => {
	test('outputs JSON in json mode with BaseCliError', () => {
		const spy = spyOn(console, 'error').mockImplementation(() => {});
		const error = new SandboxNotFoundError('abc123');
		output_error(error, true);
		expect(spy).toHaveBeenCalledWith(
			'{"error":true,"code":"SANDBOX_NOT_FOUND","message":"Sandbox not found: abc123"}',
		);
		spy.mockRestore();
		process.exitCode = 0;
	});

	test('outputs text in non-json mode with BaseCliError', () => {
		const spy = spyOn(console, 'error').mockImplementation(() => {});
		const error = new SandboxNotFoundError('abc123');
		output_error(error, false);
		expect(spy).toHaveBeenCalledWith(
			'Error: Sandbox not found: abc123',
		);
		spy.mockRestore();
		process.exitCode = 0;
	});

	test('outputs JSON in json mode with CliError object', () => {
		const spy = spyOn(console, 'error').mockImplementation(() => {});
		const error = {
			error: true as const,
			code: 'CUSTOM_ERROR',
			message: 'Custom message',
		};
		output_error(error, true);
		expect(spy).toHaveBeenCalledWith(
			'{"error":true,"code":"CUSTOM_ERROR","message":"Custom message"}',
		);
		spy.mockRestore();
		process.exitCode = 0;
	});

	test('outputs text in non-json mode with CliError object', () => {
		const spy = spyOn(console, 'error').mockImplementation(() => {});
		const error = {
			error: true as const,
			code: 'CUSTOM_ERROR',
			message: 'Custom message',
		};
		output_error(error, false);
		expect(spy).toHaveBeenCalledWith('Error: Custom message');
		spy.mockRestore();
		process.exitCode = 0;
	});

	test('sets process.exitCode to 1', () => {
		const spy = spyOn(console, 'error').mockImplementation(() => {});
		const error = new SdkError('failed');
		output_error(error, false);
		expect(process.exitCode).toBe(1);
		spy.mockRestore();
		// Reset to 0 to not affect bun's exit code
		process.exitCode = 0;
	});
});

describe('wrap_sdk_call', () => {
	test('returns result on success', async () => {
		const result = await wrap_sdk_call(() =>
			Promise.resolve('success'),
		);
		expect(result).toBe('success');
	});

	test('returns complex result on success', async () => {
		const data = { id: 'abc', state: 'running' };
		const result = await wrap_sdk_call(() => Promise.resolve(data));
		expect(result).toEqual(data);
	});

	test('throws SandboxNotFoundError when sandbox_id provided and not found', async () => {
		const fn = () =>
			Promise.reject(new Error('Sandbox not found'));
		await expect(wrap_sdk_call(fn, 'abc123')).rejects.toThrow(
			SandboxNotFoundError,
		);
		await expect(wrap_sdk_call(fn, 'abc123')).rejects.toThrow(
			'Sandbox not found: abc123',
		);
	});

	test('throws SdkError for not-found without sandbox_id', async () => {
		const fn = () =>
			Promise.reject(new Error('Sandbox not found'));
		await expect(wrap_sdk_call(fn)).rejects.toThrow(SdkError);
	});

	test('throws SdkError for other failures', async () => {
		const fn = () => Promise.reject(new Error('Network timeout'));
		await expect(wrap_sdk_call(fn, 'abc123')).rejects.toThrow(
			SdkError,
		);
		await expect(wrap_sdk_call(fn, 'abc123')).rejects.toThrow(
			'Network timeout',
		);
	});

	test('wraps non-Error rejections in SdkError', async () => {
		const fn = () => Promise.reject('string error');
		await expect(wrap_sdk_call(fn)).rejects.toThrow(SdkError);
		await expect(wrap_sdk_call(fn)).rejects.toThrow('string error');
	});
});
