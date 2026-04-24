/**
 * run command
 * Create a disposable sandbox, run a command, and clean up.
 */

import { defineCommand } from 'citty';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import { dirname } from 'node:path';
import {
	parse_int_flag_or_exit,
	shell_escape,
} from '../core/utils.js';
import type { Sandbox } from '../sandbox/index.js';
import {
	BaseCliError,
	create_sandbox,
	is_missing_api_key_error,
	output_error,
	SdkError,
} from '../sandbox/index.js';

interface SshExecResult {
	exit_code: number;
	stdout: string;
	stderr: string;
	timed_out: boolean;
}

interface CleanupResult {
	deleted: boolean;
	error?: string;
}

function parse_env_file(path: string): Record<string, string> {
	const content = fs.readFileSync(path, 'utf-8');
	const env: Record<string, string> = {};
	for (const line of content.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const [key, ...rest] = trimmed.split('=');
		if (key) env[key] = rest.join('=');
	}
	return env;
}

function parse_env_flags(
	value: string | undefined,
): Record<string, string> {
	if (!value) return {};
	const env: Record<string, string> = {};
	for (const part of value.split(',')) {
		const [key, ...value_parts] = part.trim().split('=');
		if (key && value_parts.length > 0) {
			env[key] = value_parts.join('=');
		}
	}
	return env;
}

export function command_from_raw_args(
	raw_args: string[],
): string | null {
	const separator_index = raw_args.indexOf('--');
	if (separator_index === -1) return null;

	const command_args = raw_args.slice(separator_index + 1);
	if (command_args.length === 0) return null;
	if (command_args.length === 1) return command_args[0];
	return command_args.map(shell_escape).join(' ');
}

export function build_remote_command(options: {
	command: string;
	repo?: string;
	branch?: string;
	cwd?: string;
}): { command: string; cwd?: string } {
	const commands: string[] = [];
	let run_cwd = options.cwd;

	if (options.repo) {
		run_cwd = run_cwd ?? '/home/daytona/project';
		commands.push(`mkdir -p ${shell_escape(dirname(run_cwd))}`);
		commands.push(`rm -rf ${shell_escape(run_cwd)}`);
		const branch_args = options.branch
			? ` --branch ${shell_escape(options.branch)}`
			: '';
		commands.push(
			`git clone --depth 1${branch_args} ${shell_escape(options.repo)} ${shell_escape(run_cwd)}`,
		);
	}

	if (run_cwd) {
		commands.push(`cd ${shell_escape(run_cwd)}`);
	}

	commands.push(options.command);

	return {
		command: commands.join(' && '),
		cwd: run_cwd,
	};
}

async function ssh_exec(options: {
	token: string;
	command: string;
	timeout_ms: number;
}): Promise<SshExecResult> {
	return new Promise((resolve) => {
		const proc = spawn(
			'ssh',
			[
				'-o',
				'StrictHostKeyChecking=no',
				'-o',
				'BatchMode=yes',
				`${options.token}@ssh.app.daytona.io`,
				options.command,
			],
			{ stdio: ['ignore', 'pipe', 'pipe'] },
		);

		let stdout = '';
		let stderr = '';
		let timed_out = false;

		const timeout_id = setTimeout(() => {
			timed_out = true;
			proc.kill('SIGTERM');
			setTimeout(() => {
				if (!proc.killed) {
					proc.kill('SIGKILL');
				}
			}, 5000);
		}, options.timeout_ms);

		proc.stdout?.on('data', (data) => {
			stdout += data.toString();
		});

		proc.stderr?.on('data', (data) => {
			stderr += data.toString();
		});

		proc.on('close', (code) => {
			clearTimeout(timeout_id);
			resolve({
				exit_code: timed_out ? 124 : (code ?? 1),
				stdout,
				stderr: timed_out
					? `Command timed out after ${options.timeout_ms}ms\n${stderr}`
					: stderr,
				timed_out,
			});
		});

		proc.on('error', (error) => {
			clearTimeout(timeout_id);
			resolve({
				exit_code: 1,
				stdout: '',
				stderr: error.message,
				timed_out: false,
			});
		});
	});
}

async function cleanup_sandbox(
	sandbox: Sandbox,
	timeout: number,
): Promise<CleanupResult> {
	try {
		await sandbox.delete(timeout);
		return { deleted: true };
	} catch (error) {
		return {
			deleted: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

export default defineCommand({
	meta: {
		name: 'run',
		description:
			'Run a command in a fresh disposable Daytona sandbox',
	},
	args: {
		snapshot: {
			type: 'string',
			description: 'Use pre-built snapshot',
		},
		image: {
			type: 'string',
			description:
				'Base Docker image (default: node:22-bookworm-slim)',
		},
		name: {
			type: 'string',
			description: 'Sandbox name',
		},
		repo: {
			type: 'string',
			description: 'Git repository to clone before running command',
		},
		branch: {
			type: 'string',
			description: 'Git branch to clone with --repo',
		},
		cwd: {
			type: 'string',
			description:
				'Working directory for the command or clone target for --repo',
		},
		'auto-stop': {
			type: 'string',
			description: 'Auto-stop interval in minutes (0 to disable)',
		},
		timeout: {
			type: 'string',
			description: 'Command timeout in seconds (default: 120)',
		},
		'create-timeout': {
			type: 'string',
			description:
				'Sandbox creation timeout in seconds (default: 120)',
		},
		'delete-timeout': {
			type: 'string',
			description:
				'Sandbox deletion timeout in seconds (default: 60)',
		},
		'env-file': {
			type: 'string',
			description: 'Path to .env file',
		},
		env: {
			type: 'string',
			description:
				'Environment variables (KEY=VALUE, comma-separated)',
		},
		keep: {
			type: 'boolean',
			description: 'Keep sandbox after command completes',
		},
		json: {
			type: 'boolean',
			description: 'Output structured JSON result',
		},
	},
	async run({ args, rawArgs }) {
		const command = command_from_raw_args(rawArgs);
		if (!command) {
			output_error(
				{
					error: true,
					code: 'MISSING_COMMAND',
					message:
						'Provide a command after --, for example: ralph-town run -- pnpx my-pi@latest --help',
				},
				!!args.json,
			);
			return;
		}

		let env_vars: Record<string, string> = {};
		if (args['env-file']) {
			try {
				env_vars = parse_env_file(args['env-file']);
			} catch {
				output_error(
					{
						error: true,
						code: 'ENV_FILE_ERROR',
						message: `Failed to read env file: ${args['env-file']}`,
					},
					!!args.json,
				);
				return;
			}
		}
		env_vars = { ...env_vars, ...parse_env_flags(args.env) };

		const timeout = parse_int_flag_or_exit(
			args.timeout,
			'timeout',
			120,
			args.json,
		);
		const create_timeout = parse_int_flag_or_exit(
			args['create-timeout'],
			'create-timeout',
			120,
			args.json,
		);
		const delete_timeout = parse_int_flag_or_exit(
			args['delete-timeout'],
			'delete-timeout',
			60,
			args.json,
		);
		const auto_stop = args['auto-stop']
			? parse_int_flag_or_exit(
					args['auto-stop'],
					'auto-stop',
					0,
					args.json,
				)
			: undefined;

		const started_at = Date.now();
		let sandbox: Sandbox | undefined;
		let cleanup: CleanupResult = { deleted: false };

		try {
			sandbox = await create_sandbox({
				name: args.name,
				snapshot: args.snapshot,
				image: args.image,
				auto_stop_interval: auto_stop,
				timeout: create_timeout,
				env_vars:
					Object.keys(env_vars).length > 0 ? env_vars : undefined,
			});

			const access = await sandbox.get_ssh_access(
				Math.max(5, Math.ceil(timeout / 60) + 5),
			);
			const remote = build_remote_command({
				command,
				repo: args.repo,
				branch: args.branch,
				cwd: args.cwd,
			});
			const result = await ssh_exec({
				token: access.token,
				command: remote.command,
				timeout_ms: timeout * 1000,
			});

			if (!args.keep) {
				cleanup = await cleanup_sandbox(sandbox, delete_timeout);
			}

			if (args.json) {
				console.log(
					JSON.stringify({
						sandbox_id: sandbox.id,
						command,
						repo: args.repo ?? null,
						branch: args.branch ?? null,
						cwd: remote.cwd ?? null,
						exit_code: result.exit_code,
						stdout: result.stdout,
						stderr: result.stderr,
						timed_out: result.timed_out,
						duration_ms: Date.now() - started_at,
						kept: !!args.keep,
						deleted: args.keep ? false : cleanup.deleted,
						cleanup_error: cleanup.error ?? null,
					}),
				);
			} else {
				if (result.stdout) process.stdout.write(result.stdout);
				if (result.stderr) process.stderr.write(result.stderr);
				if (args.keep) {
					console.error(`\nSandbox kept: ${sandbox.id}`);
				} else if (cleanup.error) {
					console.error(`\nCleanup failed: ${cleanup.error}`);
				}
			}

			process.exitCode = cleanup.error
				? result.exit_code === 0
					? 1
					: result.exit_code
				: result.exit_code;
		} catch (error) {
			if (sandbox && !args.keep) {
				cleanup = await cleanup_sandbox(sandbox, delete_timeout);
			}

			if (is_missing_api_key_error(error)) {
				output_error(
					{
						error: true,
						code: 'MISSING_API_KEY',
						message: error.message,
					},
					!!args.json,
				);
				return;
			}
			if (error instanceof BaseCliError) {
				output_error(error, !!args.json);
				return;
			}

			const wrapped = SdkError.from(error);
			if (args.json) {
				console.log(
					JSON.stringify({
						error: true,
						code: wrapped.code,
						message: wrapped.message,
						sandbox_id: sandbox?.id ?? null,
						deleted: cleanup.deleted,
						cleanup_error: cleanup.error ?? null,
					}),
				);
				process.exitCode = 1;
				return;
			}
			output_error(wrapped, false);
		}
	},
});
