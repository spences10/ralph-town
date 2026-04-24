import { describe, expect, it } from 'vitest';
import { is_command_allowed } from './sandbox.js';

describe('is_command_allowed', () => {
	it('allows normal development commands', () => {
		for (const cmd of [
			'git status',
			'gh pr list',
			'pnpm test',
			'node ./dist/index.js',
			'vitest run',
			'ls -la',
		]) {
			expect(is_command_allowed(cmd)).toBe(true);
		}
	});

	it('rejects empty commands and shell injection entrypoints', () => {
		for (const cmd of [
			'',
			'   ',
			'sudo rm -rf /',
			'bash -c whoami',
		]) {
			expect(is_command_allowed(cmd)).toBe(false);
		}
	});

	it('only checks the command binary, not substrings', () => {
		expect(is_command_allowed('git status && sudo whoami')).toBe(
			true,
		);
		expect(is_command_allowed('evilgit status')).toBe(false);
	});
});
