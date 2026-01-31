/**
 * sandbox create command
 * Create a new Daytona sandbox with pre-baked image
 */

import * as fs from 'fs';
import { defineCommand } from 'citty';
import {
	BaseCliError,
	create_sandbox,
	is_missing_api_key_error,
	output_error,
	SdkError,
} from '../../sandbox/index.js';
import { parse_int_flag_or_exit } from '../../core/utils.js';
import type { Sandbox } from '../../sandbox/index.js';

const REDACTED = '***REDACTED***';

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

function mask_token(token: string): string {
	if (token.length <= 4) return '****';
	return token.slice(0, 4) + '****' + token.slice(-4);
}

export default defineCommand({
	meta: {
		name: 'create',
		description: 'Create a new sandbox with pre-baked image',
	},
	args: {
		snapshot: {
			type: 'string',
			description: 'Use pre-built snapshot (e.g., ralph-town-dev)',
		},
		image: {
			type: 'string',
			description: 'Base Docker image (default: node:22-slim)',
		},
		name: {
			type: 'string',
			description: 'Sandbox name',
		},
		'auto-stop': {
			type: 'string',
			description: 'Auto-stop interval in minutes (0 to disable)',
		},
		timeout: {
			type: 'string',
			description: 'Creation timeout in seconds (default: 120)',
		},
		'env-file': {
			type: 'string',
			description: 'Path to .env file',
		},
		env: {
			type: 'string',
			description:
				'Environment variables (KEY=VALUE, comma-separated or repeat flag)',
		},
		json: {
			type: 'boolean',
			description: 'Output as JSON',
		},
		ssh: {
			type: 'boolean',
			description: 'Output SSH command after creation',
		},
		'show-secrets': {
			type: 'boolean',
			description: 'Show unmasked SSH token (use with --ssh)',
		},
	},
	async run({ args }) {
		// Parse env vars from --env-file first
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

		// Parse env vars from --env flag (takes precedence over file)
		if (args.env) {
			const parts = args.env.split(',');
			for (const part of parts) {
				const [key, ...valueParts] = part.trim().split('=');
				if (key && valueParts.length > 0) {
					env_vars[key] = valueParts.join('=');
				}
			}
		}
		const auto_stop = args['auto-stop']
			? parse_int_flag_or_exit(
					args['auto-stop'],
					'auto-stop',
					0,
					args.json,
				)
			: undefined;
		const timeout = args.timeout
			? parse_int_flag_or_exit(args.timeout, 'timeout', 120, args.json)
			: undefined;

		if (!args.json) {
			console.log('Creating sandbox...');
		}

		let sandbox: Sandbox | undefined;
		try {
			sandbox = await create_sandbox({
				name: args.name,
				snapshot: args.snapshot,
				image: args.image,
				auto_stop_interval: auto_stop,
				timeout,
				env_vars:
					Object.keys(env_vars).length > 0 ? env_vars : undefined,
				on_build_log:
					args.json || args.snapshot
						? undefined
						: (chunk) => process.stdout.write(chunk),
			});

			const work_dir = await sandbox.get_work_dir();

			// Get SSH access if requested
			let ssh_info: { token: string; command: string } | undefined;
			if (args.ssh) {
				const access = await sandbox.get_ssh_access();
				ssh_info = {
					token: access.token,
					command: access.command,
				};
			}

			if (args.json) {
				const output: Record<string, unknown> = {
					id: sandbox.id,
					state: sandbox.state,
					work_dir: work_dir || null,
				};
				if (ssh_info) {
					const show_secrets = args['show-secrets'];
					const display_token = show_secrets
						? ssh_info.token
						: REDACTED;
					output.ssh = {
						token: display_token,
						token_masked: !show_secrets,
						command:
							'ssh ' + display_token + '@ssh.app.daytona.io',
					};
				}
				console.log(JSON.stringify(output));
			} else {
				console.log('\nSandbox created successfully!');
				console.log('ID: ' + sandbox.id);
				console.log('State: ' + sandbox.state);
				if (work_dir) {
					console.log('Working directory: ' + work_dir);
				}
				if (ssh_info) {
					const show_secrets = args['show-secrets'];
					if (show_secrets) {
						console.log(
							'SSH: ssh ' +
								ssh_info.token +
								'@ssh.app.daytona.io',
						);
					} else {
						const masked = mask_token(ssh_info.token);
						console.log(
							'SSH: ssh ' +
								masked +
								'@ssh.app.daytona.io (use --show-secrets for full token)',
						);
					}
				}
			}
		} catch (error) {
			// Clean up sandbox on partial failure
			if (sandbox) {
				try {
					await sandbox.delete();
				} catch {
					// Ignore cleanup errors
				}
			}

			if (is_missing_api_key_error(error)) {
				output_error(
					{
						error: true,
						code: 'MISSING_API_KEY',
						message: (error as Error).message,
					},
					!!args.json,
				);
				return;
			}
			if (error instanceof BaseCliError) {
				output_error(error, !!args.json);
				return;
			}
			output_error(SdkError.from(error), !!args.json);
		}
	},
});
