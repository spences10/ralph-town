/**
 * sandbox create command
 * Create a new Daytona sandbox with pre-baked image
 */

import { defineCommand } from 'citty';
import {
	create_sandbox,
	is_missing_api_key_error,
} from '../../sandbox/index.js';

export default defineCommand({
	meta: {
		name: 'create',
		description: 'Create a new sandbox with pre-baked image',
	},
	args: {
		image: {
			type: 'string',
			description: 'Base Docker image (default: node:22-slim)',
		},
		name: {
			type: 'string',
			description: 'Sandbox name label',
		},
		'auto-stop': {
			type: 'string',
			description: 'Auto-stop interval in minutes (0 to disable)',
		},
		timeout: {
			type: 'string',
			description: 'Creation timeout in seconds (default: 120)',
		},
		json: {
			type: 'boolean',
			description: 'Output as JSON',
		},
	},
	async run({ args }) {
		const auto_stop = args['auto-stop']
			? parseInt(args['auto-stop'], 10)
			: undefined;
		const timeout = args.timeout ? parseInt(args.timeout, 10) : undefined;

		if (!args.json) {
			console.log('Creating sandbox...');
		}

		try {
			const sandbox = await create_sandbox({
				image: args.image,
				auto_stop_interval: auto_stop,
				timeout,
				labels: args.name ? { name: args.name } : undefined,
				on_build_log: args.json ? undefined : (chunk) => process.stdout.write(chunk),
			});

			const work_dir = await sandbox.get_work_dir();

			if (args.json) {
				console.log(JSON.stringify({
					id: sandbox.id,
					state: sandbox.state,
					work_dir: work_dir || null,
				}));
			} else {
				console.log('\nSandbox created successfully!');
				console.log('ID: ' + sandbox.id);
				console.log('State: ' + sandbox.state);
				if (work_dir) {
					console.log('Working directory: ' + work_dir);
				}
			}
		} catch (error) {
			if (is_missing_api_key_error(error)) {
				if (args.json) {
					console.error(JSON.stringify({ error: error.message }));
				} else {
					console.error('Error: ' + error.message);
				}
				process.exit(1);
			}
			throw error;
		}
	},
});
