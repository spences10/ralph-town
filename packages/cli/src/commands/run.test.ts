import { describe, expect, it } from 'vitest';
import {
	build_exec_wrapper,
	build_remote_command,
	command_from_raw_args,
	parse_exec_wrapper_output,
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

describe('exec wrapper', () => {
	it('builds a wrapper that hides command output behind markers', () => {
		const wrapper = build_exec_wrapper({
			command: 'printf "out"; printf "err" >&2; exit 7',
			timeout_sec: 120,
			marker: '__RT__',
		});

		expect(wrapper).toContain('__RT__EXIT:%s');
		expect(wrapper).toContain('__RT__STDOUT:');
		expect(wrapper).toContain('__RT__STDERR:');
		expect(wrapper).toContain("timeout '120s'");
		expect(wrapper).not.toContain('printf "out"');
	});

	it('parses marked stdout, stderr, and exit code', () => {
		const output = [
			'__RT__EXIT:7',
			`__RT__STDOUT:${Buffer.from('out').toString('base64')}`,
			`__RT__STDERR:${Buffer.from('err').toString('base64')}`,
			'__RT__END',
		].join('\n');

		expect(
			parse_exec_wrapper_output({
				output,
				marker: '__RT__',
				timeout_sec: 120,
			}),
		).toEqual({
			exit_code: 7,
			stdout: 'out',
			stderr: 'err',
			timed_out: false,
		});
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
