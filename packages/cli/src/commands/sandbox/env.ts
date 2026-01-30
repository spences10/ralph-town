/**
 * sandbox env command
 * Manage environment variables on Daytona sandboxes
 */

import { defineCommand } from 'citty';
import {
	create_daytona_client,
	is_missing_api_key_error,
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
				if (args.json) {
					console.error(JSON.stringify({ error: error.message }));
				} else {
					console.error('Error: ' + error.message);
				}
				process.exitCode = 1;
				return;
			}
			throw error;
		}

		try {
			const sandbox = await daytona.get(args.id);
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
			const msg =
				error instanceof Error ? error.message : String(error);
			if (args.json) {
				console.error(JSON.stringify({ error: msg }));
			} else {
				console.error('Error: ' + msg);
			}
			process.exitCode = 1;
		}
	},
});

const set_command = defineCommand({
	meta: {
		name: 'set',
		description: 'Set environment variable for a sandbox (requires restart)',
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
			const msg =
				'Invalid format. Use KEY=VALUE (e.g., NODE_ENV=production)';
			if (args.json) {
				console.error(JSON.stringify({ error: msg }));
			} else {
				console.error('Error: ' + msg);
			}
			process.exitCode = 1;
			return;
		}

		const key = env_var.substring(0, eq_index);
		const value = env_var.substring(eq_index + 1);

		if (!key) {
			const msg = 'Environment variable key cannot be empty';
			if (args.json) {
				console.error(JSON.stringify({ error: msg }));
			} else {
				console.error('Error: ' + msg);
			}
			process.exitCode = 1;
			return;
		}

		let daytona;
		try {
			daytona = create_daytona_client();
		} catch (error) {
			if (is_missing_api_key_error(error)) {
				if (args.json) {
					console.error(JSON.stringify({ error: error.message }));
				} else {
					console.error('Error: ' + error.message);
				}
				process.exitCode = 1;
				return;
			}
			throw error;
		}

		try {
			const sandbox = await daytona.get(args.id);

			// Note: The Daytona SDK does not provide a direct API to modify
			// env vars on a running sandbox. Env vars are set at creation time.
			// This command sets the env var in the current shell session only.
			const escaped_value = value.replace(/'/g, "'\\''");
			const cmd = 'export ' + key + "='" + escaped_value + "'";
			const result = await sandbox.process.executeCommand(cmd);

			if (result.exitCode !== 0) {
				const msg = 'Failed to set environment variable';
				if (args.json) {
					console.error(
						JSON.stringify({ error: msg, details: result.result }),
					);
				} else {
					console.error('Error: ' + msg);
					if (result.result) {
						console.error(result.result);
					}
				}
				process.exitCode = 1;
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
			const msg =
				error instanceof Error ? error.message : String(error);
			if (args.json) {
				console.error(JSON.stringify({ error: msg }));
			} else {
				console.error('Error: ' + msg);
			}
			process.exitCode = 1;
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
