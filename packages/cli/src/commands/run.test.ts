import { describe, expect, it } from 'vitest';
import {
	build_remote_command,
	command_from_raw_args,
} from './run.js';

describe('command_from_raw_args', () => {
	it('requires a -- separator before the command', () => {
		expect(command_from_raw_args(['--json'])).toBeNull();
		expect(command_from_raw_args(['--json', '--'])).toBeNull();
	});

	it('keeps a single command string intact', () => {
		expect(
			command_from_raw_args([
				'--json',
				'--',
				'pnpx my-pi@latest --help',
			]),
		).toBe('pnpx my-pi@latest --help');
	});

	it('shell-escapes multiple command arguments', () => {
		expect(
			command_from_raw_args(['--', 'sh', '-lc', 'echo hi && pwd']),
		).toBe("'sh' '-lc' 'echo hi && pwd'");
	});
});

describe('build_remote_command', () => {
	it('returns the command unchanged when no setup is needed', () => {
		expect(
			build_remote_command({ command: 'pnpx my-pi@latest --help' }),
		).toEqual({
			command: 'pnpx my-pi@latest --help',
			cwd: undefined,
		});
	});

	it('runs inside cwd when provided', () => {
		expect(
			build_remote_command({
				command: 'pnpm test',
				cwd: '/work/project',
			}).command,
		).toBe("cd '/work/project' && pnpm test");
	});

	it('clones repos into the working directory before running', () => {
		const result = build_remote_command({
			command: 'pnpm test',
			repo: 'https://github.com/example/project.git',
			branch: 'main',
		});

		expect(result.cwd).toBe('/home/daytona/project');
		expect(result.command).toContain(
			"git clone --depth 1 --branch 'main' 'https://github.com/example/project.git' '/home/daytona/project'",
		);
		expect(result.command.endsWith(' && pnpm test')).toBe(true);
	});
});
