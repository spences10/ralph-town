/**
 * sandbox env command
 * Manage environment variables on Daytona sandboxes
 */

import { defineCommand } from 'citty';
import {
	BaseCliError,
	create_daytona_client,
	is_missing_api_key_error,
	output_error,
	SdkError,
	wrap_sdk_call,
} from '../../sandbox/index.js';

const list_command = defineCommand({
	meta: {
		name: 'list',
		description: 'List environment variables for a sandbox',
	},
	args: {
		id: {
			type: 'positional',
			description: 'Sandbox ID or name',
			required: true,
		},
		json: {
			type: 'boolean',
			description: 'Output as JSON',
		},
	},
	async run({ args }) {
		let daytona;
		try {
			daytona = create_daytona_client();
		} catch (error) {
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
			throw error;
		}

		try {
			const sandbox = await wrap_sdk_call(
				() => daytona.get(args.id),
				args.id,
			);
			const env = sandbox.env || {};

			if (args.json) {
				console.log(JSON.stringify(env));
			} else {
				const keys = Object.keys(env);
				if (keys.length === 0) {
					console.log('No environment variables set');
				} else {
					console.log('Environment variables:');
					for (const key of keys.sort()) {
						console.log('  ' + key + '=' + env[key]);
					}
				}
			}
		} catch (error) {
			if (error instanceof BaseCliError) {
				output_error(error, !!args.json);
				return;
			}
			output_error(SdkError.from(error), !!args.json);
		}
	},
});

const set_command = defineCommand({
	meta: {
		name: 'set',
		description:
			'Set environment variable for a sandbox (requires restart)',
	},
	args: {
		id: {
			type: 'positional',
			description: 'Sandbox ID or name',
			required: true,
		},
		env_var: {
			type: 'positional',
			description: 'Environment variable in KEY=VALUE format',
			required: true,
		},
		json: {
			type: 'boolean',
			description: 'Output as JSON',
		},
	},
	async run({ args }) {
		// Parse KEY=VALUE
		const env_var = args.env_var as string;
		const eq_index = env_var.indexOf('=');
		if (eq_index === -1) {
			output_error(
				{
					error: true,
					code: 'INVALID_FORMAT',
					message:
						'Invalid format. Use KEY=VALUE (e.g., NODE_ENV=production)',
				},
				!!args.json,
			);
			return;
		}

		const key = env_var.substring(0, eq_index);
		const value = env_var.substring(eq_index + 1);

		if (!key) {
			output_error(
				{
					error: true,
					code: 'INVALID_KEY',
					message: 'Environment variable key cannot be empty',
				},
				!!args.json,
			);
			return;
		}

		let daytona;
		try {
			daytona = create_daytona_client();
		} catch (error) {
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
			throw error;
		}

		try {
			const sandbox = await wrap_sdk_call(
				() => daytona.get(args.id),
				args.id,
			);

			// Note: The Daytona SDK does not provide a direct API to modify
			// env vars on a running sandbox. Env vars are set at creation time.
			// This command sets the env var in the current shell session only.
			const escaped_value = value.replace(/'/g, "'\\''");
			const cmd = 'export ' + key + "='" + escaped_value + "'";
			const result = await wrap_sdk_call(() =>
				sandbox.process.executeCommand(cmd),
			);

			if (result.exitCode !== 0) {
				output_error(
					{
						error: true,
						code: 'EXEC_FAILED',
						message: 'Failed to set environment variable',
					},
					!!args.json,
				);
				return;
			}

			if (args.json) {
				console.log(
					JSON.stringify({
						success: true,
						key,
						value,
						note: 'Variable set in shell session only. For persistent env vars, use --env at sandbox creation.',
					}),
				);
			} else {
				console.log('Set ' + key + '=' + value);
				console.log(
					'Note: This sets the variable in the current shell session only.',
				);
				console.log(
					'For persistent env vars, use --env flag when creating the sandbox.',
				);
			}
		} catch (error) {
			if (error instanceof BaseCliError) {
				output_error(error, !!args.json);
				return;
			}
			output_error(SdkError.from(error), !!args.json);
		}
	},
});

export default defineCommand({
	meta: {
		name: 'env',
		description: 'Manage sandbox environment variables',
	},
	subCommands: {
		list: list_command,
		set: set_command,
	},
});
