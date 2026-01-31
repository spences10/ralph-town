/**
 * sandbox create command
 * Create a new Daytona sandbox with pre-baked image
 */

import * as fs from 'fs';
import { defineCommand } from 'citty';
import {
	create_sandbox,
	is_missing_api_key_error,
} from '../../sandbox/index.js';
import { parse_int_flag_or_exit } from '../../core/utils.js';
import type { Sandbox } from '../../sandbox/index.js';

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
	},
	async run({ args }) {
		// Parse env vars from --env-file first
		let env_vars: Record<string, string> = {};
		if (args['env-file']) {
			try {
				env_vars = parse_env_file(args['env-file']);
			} catch (error) {
				const msg = `Failed to read env file: ${args['env-file']}`;
				if (args.json) {
					console.error(JSON.stringify({ error: msg }));
				} else {
					console.error('Error: ' + msg);
				}
				process.exitCode = 1;
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

			if (args.json) {
				console.log(
					JSON.stringify({
						id: sandbox.id,
						state: sandbox.state,
						work_dir: work_dir || null,
					}),
				);
			} else {
				console.log('\nSandbox created successfully!');
				console.log('ID: ' + sandbox.id);
				console.log('State: ' + sandbox.state);
				if (work_dir) {
					console.log('Working directory: ' + work_dir);
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
	},
});
