/**
 * run command
 * Create a disposable sandbox, run a command, and clean up.
 */

import { defineCommand } from 'citty';
import {
	normalize_sandbox_env,
	parse_env_file,
	parse_env_flags,
} from '../core/env.js';
import {
	parse_int_flag_or_exit,
	shell_escape,
} from '../core/utils.js';
import { run_sandbox } from '../operations.js';
import {
	BaseCliError,
	is_missing_api_key_error,
	output_error,
	SdkError,
} from '../sandbox/index.js';

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

		try {
			const result = await run_sandbox({
				command,
				name: args.name,
				snapshot: args.snapshot,
				image: args.image,
				repo: args.repo,
				branch: args.branch,
				cwd: args.cwd,
				auto_stop_interval: auto_stop,
				timeout,
				create_timeout,
				delete_timeout,
				keep: args.keep,
				env_vars:
					Object.keys(env_vars).length > 0 ? env_vars : undefined,
			});
			if (args.json) {
				console.log(JSON.stringify(result));
			} else {
				if (result.stdout) process.stdout.write(result.stdout);
				if (result.stderr) process.stderr.write(result.stderr);
				if (args.keep)
					console.error(`\nSandbox kept: ${result.sandbox_id}`);
				else if (result.cleanup_error)
					console.error(`\nCleanup failed: ${result.cleanup_error}`);
			}
			process.exitCode =
				result.exit_code || (result.cleanup_error ? 1 : 0);
		} catch (error) {
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
			output_error(
				error instanceof BaseCliError ? error : SdkError.from(error),
				!!args.json,
			);
		}
	},
});
