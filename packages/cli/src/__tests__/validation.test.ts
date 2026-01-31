import { describe, expect, test } from 'bun:test';
import {
	SandboxNameValidationError,
	validate_sandbox_name,
} from '../sandbox/validation';

describe('validate_sandbox_name', () => {
	test('accepts valid simple names', () => {
		expect(() => validate_sandbox_name('sandbox')).not.toThrow();
		expect(() => validate_sandbox_name('my-sandbox')).not.toThrow();
		expect(() => validate_sandbox_name('sandbox123')).not.toThrow();
	});

	test('accepts single character name', () => {
		expect(() => validate_sandbox_name('a')).not.toThrow();
		expect(() => validate_sandbox_name('1')).not.toThrow();
	});

	test('accepts max length name (63 chars)', () => {
		const maxName = 'a'.repeat(63);
		expect(() => validate_sandbox_name(maxName)).not.toThrow();
	});

	test('rejects empty string', () => {
		expect(() => validate_sandbox_name('')).toThrow(
			SandboxNameValidationError,
		);
		expect(() => validate_sandbox_name('')).toThrow(
			'at least 1 character',
		);
	});

	test('rejects names exceeding 63 characters', () => {
		const longName = 'a'.repeat(64);
		expect(() => validate_sandbox_name(longName)).toThrow(
			SandboxNameValidationError,
		);
		expect(() => validate_sandbox_name(longName)).toThrow(
			'at most 63 characters',
		);
	});

	test('rejects names starting with hyphen', () => {
		expect(() => validate_sandbox_name('-sandbox')).toThrow(
			SandboxNameValidationError,
		);
		expect(() => validate_sandbox_name('-sandbox')).toThrow(
			'cannot start or end with a hyphen',
		);
	});

	test('rejects names ending with hyphen', () => {
		expect(() => validate_sandbox_name('sandbox-')).toThrow(
			SandboxNameValidationError,
		);
	});

	test('rejects names with special characters', () => {
		expect(() => validate_sandbox_name('sand_box')).toThrow(
			SandboxNameValidationError,
		);
		expect(() => validate_sandbox_name('sand.box')).toThrow(
			SandboxNameValidationError,
		);
		expect(() => validate_sandbox_name('sand box')).toThrow(
			SandboxNameValidationError,
		);
		expect(() => validate_sandbox_name('sand/box')).toThrow(
			SandboxNameValidationError,
		);
	});

	test('rejects command injection attempts', () => {
		expect(() => validate_sandbox_name('box;rm -rf')).toThrow(
			SandboxNameValidationError,
		);
		expect(() => validate_sandbox_name('box`whoami`')).toThrow(
			SandboxNameValidationError,
		);
		expect(() => validate_sandbox_name('$(cat /etc)')).toThrow(
			SandboxNameValidationError,
		);
	});

	test('case insensitive pattern allows uppercase', () => {
		expect(() => validate_sandbox_name('MyBox')).not.toThrow();
		expect(() => validate_sandbox_name('SANDBOX')).not.toThrow();
	});
});
