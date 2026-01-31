import { describe, expect, test } from 'bun:test';
import {
	parse_int_flag,
	shell_escape,
	validate_branch_name,
} from '../core/utils';

describe('shell_escape', () => {
	test('escapes single quotes', () => {
		expect(shell_escape("it's")).toBe("'it'\\''s'");
	});

	test('wraps simple string in single quotes', () => {
		expect(shell_escape('hello')).toBe("'hello'");
	});

	test('handles empty string', () => {
		expect(shell_escape('')).toBe("''");
	});

	test('prevents command injection with semicolon', () => {
		const malicious = 'foo; rm -rf /';
		const escaped = shell_escape(malicious);
		expect(escaped).toBe("'foo; rm -rf /'");
		expect(escaped).not.toContain(';rm');
	});

	test('prevents command injection with backticks', () => {
		const malicious = '`whoami`';
		const escaped = shell_escape(malicious);
		expect(escaped).toBe("'`whoami`'");
	});

	test('prevents command injection with $(...)', () => {
		const malicious = '$(cat /etc/passwd)';
		const escaped = shell_escape(malicious);
		expect(escaped).toBe("'$(cat /etc/passwd)'");
	});

	test('handles multiple single quotes', () => {
		expect(shell_escape("a'b'c")).toBe("'a'\\''b'\\''c'");
	});
});

describe('validate_branch_name', () => {
	test('accepts valid simple branch name', () => {
		expect(validate_branch_name('main')).toBe(true);
		expect(validate_branch_name('feature-branch')).toBe(true);
		expect(validate_branch_name('fix/issue-123')).toBe(true);
	});

	test('accepts alphanumeric with dots', () => {
		expect(validate_branch_name('v1.0.0')).toBe(true);
		expect(validate_branch_name('release.2024')).toBe(true);
	});

	test('accepts underscores', () => {
		expect(validate_branch_name('feature_name')).toBe(true);
	});

	test('rejects path traversal with ..', () => {
		expect(validate_branch_name('../etc/passwd')).toBe(false);
		expect(validate_branch_name('feature/../main')).toBe(false);
		expect(validate_branch_name('..hidden')).toBe(false);
	});

	test('rejects spaces', () => {
		expect(validate_branch_name('my branch')).toBe(false);
	});

	test('rejects special characters', () => {
		expect(validate_branch_name('branch;rm -rf')).toBe(false);
		expect(validate_branch_name('branch`whoami`')).toBe(false);
		expect(validate_branch_name('branch$(cmd)')).toBe(false);
		expect(validate_branch_name("branch'name")).toBe(false);
	});

	test('rejects empty string', () => {
		expect(validate_branch_name('')).toBe(false);
	});
});

describe('parse_int_flag', () => {
	test('returns default when value undefined', () => {
		expect(parse_int_flag(undefined, 'count', 10)).toBe(10);
	});

	test('parses valid integer', () => {
		expect(parse_int_flag('42', 'count', 10)).toBe(42);
	});

	test('parses zero', () => {
		expect(parse_int_flag('0', 'count', 10)).toBe(0);
	});

	test('parses negative numbers', () => {
		expect(parse_int_flag('-5', 'count', 10)).toBe(-5);
	});

	test('throws on NaN string', () => {
		expect(() => parse_int_flag('abc', 'count', 10)).toThrow(
			'Invalid value for --count: "abc" is not a number',
		);
	});

	test('throws on empty string', () => {
		expect(() => parse_int_flag('', 'count', 10)).toThrow(
			'is not a number',
		);
	});

	test('throws on float string', () => {
		expect(() => parse_int_flag('3.14', 'count', 10)).not.toThrow();
		expect(parse_int_flag('3.14', 'count', 10)).toBe(3);
	});

	test('respects min constraint', () => {
		expect(() => parse_int_flag('5', 'count', 10, 10)).toThrow(
			'--count must be >= 10',
		);
		expect(parse_int_flag('10', 'count', 10, 10)).toBe(10);
	});

	test('respects max constraint', () => {
		expect(() => parse_int_flag('100', 'count', 10, 0, 50)).toThrow(
			'--count must be <= 50',
		);
		expect(parse_int_flag('50', 'count', 10, 0, 50)).toBe(50);
	});

	test('handles very large numbers', () => {
		const big = '9999999999999999999';
		expect(parse_int_flag(big, 'count', 10)).toBe(
			parseInt(big, 10),
		);
	});
});
