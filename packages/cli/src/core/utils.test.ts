import { describe, expect, it } from 'vitest';
import {
	parse_int_flag,
	shell_escape,
	validate_branch_name,
} from './utils.js';

describe('parse_int_flag', () => {
	it('returns the default when the value is omitted', () => {
		expect(parse_int_flag(undefined, 'timeout', 120)).toBe(120);
	});

	it('parses integer strings', () => {
		expect(parse_int_flag('30', 'timeout', 120)).toBe(30);
		expect(parse_int_flag('0', 'timeout', 120)).toBe(0);
	});

	it('enforces numeric bounds', () => {
		expect(() => parse_int_flag('4', 'retries', 1, 5)).toThrow(
			'>= 5',
		);
		expect(() => parse_int_flag('11', 'retries', 1, 1, 10)).toThrow(
			'<= 10',
		);
	});

	it('rejects non-numeric values', () => {
		expect(() => parse_int_flag('abc', 'timeout', 120)).toThrow(
			'not a number',
		);
	});
});

describe('shell_escape', () => {
	it('wraps values in single quotes', () => {
		expect(shell_escape('hello world')).toBe("'hello world'");
	});

	it('escapes embedded single quotes', () => {
		expect(shell_escape("it's safe")).toBe("'it'\\''s safe'");
	});
});

describe('validate_branch_name', () => {
	it('accepts common git branch names', () => {
		expect(validate_branch_name('feature/ralph-town_1')).toBe(true);
		expect(validate_branch_name('release.2026-04')).toBe(true);
	});

	it('rejects traversal and unsafe characters', () => {
		expect(validate_branch_name('../main')).toBe(false);
		expect(validate_branch_name('feature new')).toBe(false);
		expect(validate_branch_name('main;rm-rf')).toBe(false);
	});
});
