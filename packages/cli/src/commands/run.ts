/**
 * run command
 * Create a disposable sandbox, run a command, and clean up.
 */

import { defineCommand } from 'citty';
import { dirname } from 'node:path';
import {
	normalize_sandbox_env,
	parse_env_file,
	parse_env_flags,
} from '../core/env.js';
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

interface ExecResult {
	exit_code: number;
	stdout: string;
	stderr: string;
	timed_out: boolean;
}

interface CleanupResult {
	deleted: boolean;
	error?: string;
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

export function parse_exec_wrapper_output(options: {
	output: string;
	marker: string;
	timeout_sec: number;
}): ExecResult {
	const exit_match = options.output.match(
		new RegExp(`${options.marker}EXIT:(\\d+)`),
	);
	const stdout_match = options.output.match(
		new RegExp(`${options.marker}STDOUT:([^\\n]*)`),
	);
	const stderr_match = options.output.match(
		new RegExp(`${options.marker}STDERR:([^\\n]*)`),
	);

	if (!exit_match || !stdout_match || !stderr_match) {
		return {
			exit_code: 1,
			stdout: '',
			stderr: `Could not parse Daytona execution output:\n${options.output}`,
			timed_out: false,
		};
	}

	const exit_code = Number.parseInt(exit_match[1] ?? '1', 10);
	const stdout = Buffer.from(
		stdout_match[1] ?? '',
		'base64',
	).toString('utf-8');
	const stderr = Buffer.from(
		stderr_match[1] ?? '',
		'base64',
	).toString('utf-8');
	const timed_out = exit_code === 124;

	return {
		exit_code,
		stdout,
		stderr: timed_out
			? `Command timed out after ${options.timeout_sec}s\n${stderr}`
			: stderr,
		timed_out,
	};
}

export function build_exec_wrapper(options: {
	command: string;
	timeout_sec: number;
	marker: string;
}): string {
	const command_b64 = Buffer.from(options.command, 'utf-8').toString(
		'base64',
	);
	const timeout_arg = `${options.timeout_sec}s`;

	return [
		`command_b64=${shell_escape(command_b64)}`,
		'tmp_dir=$(mktemp -d)',
		'cleanup() { rm -rf "$tmp_dir"; }',
		'trap cleanup EXIT',
		'printf %s "$command_b64" | base64 -d > "$tmp_dir/command.sh"',
		'chmod +x "$tmp_dir/command.sh"',
		'set +e',
		`if command -v timeout >/dev/null 2>&1; then timeout ${shell_escape(timeout_arg)} /bin/sh "$tmp_dir/command.sh" > "$tmp_dir/stdout" 2> "$tmp_dir/stderr"; else /bin/sh "$tmp_dir/command.sh" > "$tmp_dir/stdout" 2> "$tmp_dir/stderr"; fi`,
		'exit_code=$?',
		`printf ${shell_escape(`${options.marker}EXIT:%s\\n`)} "$exit_code"`,
		`printf ${shell_escape(`${options.marker}STDOUT:`)}`,
		'base64 "$tmp_dir/stdout" | tr -d "\\n"',
		'printf "\\n"',
		`printf ${shell_escape(`${options.marker}STDERR:`)}`,
		'base64 "$tmp_dir/stderr" | tr -d "\\n"',
		'printf "\\n"',
		`printf ${shell_escape(`${options.marker}END\\n`)}`,
		'exit 0',
	].join('; ');
}

async function sandbox_exec(options: {
	sandbox: Sandbox;
	command: string;
	timeout_sec: number;
}): Promise<ExecResult> {
	const marker = `__RALPH_TOWN_${Date.now()}_${Math.random().toString(36).slice(2)}__`;
	const wrapper = build_exec_wrapper({
		command: options.command,
		timeout_sec: options.timeout_sec,
		marker,
	});

	try {
		const result = await options.sandbox.raw.process.executeCommand(
			wrapper,
			undefined,
			undefined,
			options.timeout_sec + 30,
		);

		return parse_exec_wrapper_output({
			output: result.result,
			marker,
			timeout_sec: options.timeout_sec,
		});
	} catch (error) {
		return {
			exit_code: 124,
			stdout: '',
			stderr: `Command timed out after ${options.timeout_sec}s\n${error instanceof Error ? error.message : String(error)}`,
			timed_out: true,
		};
	}
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
		env_vars = normalize_sandbox_env({
			...env_vars,
			...parse_env_flags(args.env),
		});

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

			const remote = build_remote_command({
				command,
				repo: args.repo,
				branch: args.branch,
				cwd: args.cwd,
			});
			const result = await sandbox_exec({
				sandbox,
				command: remote.command,
				timeout_sec: timeout,
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
