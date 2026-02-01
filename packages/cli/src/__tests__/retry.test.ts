/**
 * Tests for retry logic (is_transient_error and with_retry)
 */

import { describe, expect, mock, test } from 'bun:test';
import { is_transient_error, with_retry } from '../sandbox/errors';

describe('is_transient_error', () => {
	describe('transient errors (should retry)', () => {
		test('detects ECONNRESET', () => {
			expect(is_transient_error(new Error('ECONNRESET'))).toBe(true);
			expect(is_transient_error(new Error('read econnreset'))).toBe(
				true,
			);
		});

		test('detects ECONNREFUSED', () => {
			expect(is_transient_error(new Error('ECONNREFUSED'))).toBe(
				true,
			);
			expect(
				is_transient_error(
					new Error('connect ECONNREFUSED 127.0.0.1:3000'),
				),
			).toBe(true);
		});

		test('detects ETIMEDOUT', () => {
			expect(is_transient_error(new Error('ETIMEDOUT'))).toBe(true);
			expect(
				is_transient_error(new Error('connect ETIMEDOUT')),
			).toBe(true);
		});

		test('detects ENOTFOUND', () => {
			expect(is_transient_error(new Error('ENOTFOUND'))).toBe(true);
			expect(
				is_transient_error(
					new Error('getaddrinfo ENOTFOUND api.example.com'),
				),
			).toBe(true);
		});

		test('detects socket hang up', () => {
			expect(is_transient_error(new Error('socket hang up'))).toBe(
				true,
			);
		});

		test('detects network errors', () => {
			expect(is_transient_error(new Error('network error'))).toBe(
				true,
			);
			expect(is_transient_error(new Error('Network failure'))).toBe(
				true,
			);
		});

		test('detects timeout', () => {
			expect(is_transient_error(new Error('timeout'))).toBe(true);
			expect(is_transient_error(new Error('Request timeout'))).toBe(
				true,
			);
		});

		test('detects HTTP 429 (rate limit)', () => {
			expect(is_transient_error(new Error('429'))).toBe(true);
			expect(
				is_transient_error(new Error('HTTP 429: Too Many Requests')),
			).toBe(true);
		});

		test('detects HTTP 502 (bad gateway)', () => {
			expect(is_transient_error(new Error('502'))).toBe(true);
			expect(
				is_transient_error(new Error('HTTP 502: Bad Gateway')),
			).toBe(true);
		});

		test('detects HTTP 503 (service unavailable)', () => {
			expect(is_transient_error(new Error('503'))).toBe(true);
			expect(
				is_transient_error(
					new Error('HTTP 503: Service Unavailable'),
				),
			).toBe(true);
		});
	});

	describe('non-transient errors (no retry)', () => {
		test('HTTP 404 not found is not transient', () => {
			expect(is_transient_error(new Error('HTTP 404: Not Found'))).toBe(
				false,
			);
		});

		test('HTTP 401 unauthorized is not transient', () => {
			expect(
				is_transient_error(new Error('HTTP 401: Unauthorized')),
			).toBe(false);
		});

		test('"not found" is not transient', () => {
			expect(is_transient_error(new Error('not found'))).toBe(false);
			expect(is_transient_error(new Error('Resource not found'))).toBe(
				false,
			);
		});

		test('"invalid" is not transient', () => {
			expect(is_transient_error(new Error('invalid'))).toBe(false);
			expect(is_transient_error(new Error('Invalid request'))).toBe(
				false,
			);
		});

		test('generic errors are not transient', () => {
			expect(is_transient_error(new Error('Something failed'))).toBe(
				false,
			);
			expect(is_transient_error(new Error('Unknown error'))).toBe(
				false,
			);
		});
	});

	describe('non-Error types', () => {
		test('returns false for string', () => {
			expect(is_transient_error('ECONNRESET')).toBe(false);
		});

		test('returns false for null', () => {
			expect(is_transient_error(null)).toBe(false);
		});

		test('returns false for undefined', () => {
			expect(is_transient_error(undefined)).toBe(false);
		});

		test('returns false for number', () => {
			expect(is_transient_error(503)).toBe(false);
		});

		test('returns false for object', () => {
			expect(is_transient_error({ message: 'ECONNRESET' })).toBe(
				false,
			);
		});
	});
});

describe('with_retry', () => {
	test('succeeds on first attempt (1 call)', async () => {
		const fn = mock(() => Promise.resolve('success'));
		const result = await with_retry(fn);
		expect(result).toBe('success');
		expect(fn).toHaveBeenCalledTimes(1);
	});

	test('retries on transient failure and succeeds', async () => {
		let attempt = 0;
		const fn = mock(() => {
			attempt++;
			if (attempt < 3) {
				return Promise.reject(new Error('ECONNRESET'));
			}
			return Promise.resolve('success after retry');
		});

		const result = await with_retry(fn, 3, 10); // Short delay for test
		expect(result).toBe('success after retry');
		expect(fn).toHaveBeenCalledTimes(3);
	});

	test('throws immediately on non-transient error (1 call)', async () => {
		const fn = mock(() =>
			Promise.reject(new Error('HTTP 404: Not Found')),
		);

		await expect(with_retry(fn, 3, 10)).rejects.toThrow(
			'HTTP 404: Not Found',
		);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	test('throws after max attempts exhausted', async () => {
		const fn = mock(() =>
			Promise.reject(new Error('ECONNREFUSED')),
		);

		await expect(with_retry(fn, 3, 10)).rejects.toThrow('ECONNREFUSED');
		expect(fn).toHaveBeenCalledTimes(3);
	});

	test('uses default max_attempts of 3', async () => {
		const fn = mock(() =>
			Promise.reject(new Error('ETIMEDOUT')),
		);

		await expect(with_retry(fn)).rejects.toThrow('ETIMEDOUT');
		expect(fn).toHaveBeenCalledTimes(3);
	});

	test('uses exponential backoff (verify timing)', async () => {
		const timestamps: number[] = [];
		const fn = mock(() => {
			timestamps.push(Date.now());
			if (timestamps.length < 3) {
				return Promise.reject(new Error('ECONNRESET'));
			}
			return Promise.resolve('success');
		});

		const base_delay = 50;
		await with_retry(fn, 3, base_delay);

		expect(timestamps).toHaveLength(3);

		// First retry delay should be ~base_delay (attempt 1 * base_delay)
		const first_delay = timestamps[1] - timestamps[0];
		expect(first_delay).toBeGreaterThanOrEqual(base_delay - 10);
		expect(first_delay).toBeLessThan(base_delay + 50);

		// Second retry delay should be ~2*base_delay (attempt 2 * base_delay)
		const second_delay = timestamps[2] - timestamps[1];
		expect(second_delay).toBeGreaterThanOrEqual(base_delay * 2 - 10);
		expect(second_delay).toBeLessThan(base_delay * 2 + 50);
	});

	test('throws last error when all attempts fail', async () => {
		const fn = mock(() =>
			Promise.reject(new Error('network error')),
		);

		try {
			await with_retry(fn, 2, 10);
			expect.unreachable('Should have thrown');
		} catch (e) {
			expect(e).toBeInstanceOf(Error);
			expect((e as Error).message).toBe('network error');
		}
	});

	test('works with max_attempts of 1 (no retry)', async () => {
		const fn = mock(() => Promise.reject(new Error('ECONNRESET')));

		await expect(with_retry(fn, 1, 10)).rejects.toThrow('ECONNRESET');
		expect(fn).toHaveBeenCalledTimes(1);
	});

	test('returns complex objects on success', async () => {
		const data = { id: 'sandbox-123', state: 'running' };
		const fn = mock(() => Promise.resolve(data));

		const result = await with_retry(fn);
		expect(result).toEqual(data);
	});
});
