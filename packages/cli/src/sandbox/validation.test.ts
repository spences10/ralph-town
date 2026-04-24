import { describe, expect, it } from 'vitest';
import {
	SandboxNameValidationError,
	validate_sandbox_name,
} from './validation.js';

describe('validate_sandbox_name', () => {
	it('accepts DNS-label style sandbox names', () => {
		expect(() => validate_sandbox_name('ralph-town-1')).not.toThrow();
		expect(() => validate_sandbox_name('a')).not.toThrow();
		expect(() => validate_sandbox_name('a'.repeat(63))).not.toThrow();
	});

	it('rejects empty or too-long names', () => {
		expect(() => validate_sandbox_name('')).toThrow(
			SandboxNameValidationError,
		);
		expect(() => validate_sandbox_name('a'.repeat(64))).toThrow(
			'at most 63 characters',
		);
	});

	it('rejects names with unsafe shell characters', () => {
		for (const name of [
			'-leading',
			'trailing-',
			'has spaces',
			'$(whoami)',
			'name;rm-rf',
			'../escape',
		]) {
			expect(() => validate_sandbox_name(name)).toThrow(
				SandboxNameValidationError,
			);
		}
	});
});
