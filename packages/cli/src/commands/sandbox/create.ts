/**
 * sandbox create command
 * Create a new Daytona sandbox with pre-baked image
 */

import { defineCommand } from 'citty';
import { create_sandbox } from '../../sandbox/index.js';

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
	},
	async run({ args }) {
		const auto_stop = args['auto-stop']
			? parseInt(args['auto-stop'], 10)
			: undefined;
		const timeout = args.timeout ? parseInt(args.timeout, 10) : undefined;

		console.log('Creating sandbox...');

		const sandbox = await create_sandbox({
			image: args.image,
			auto_stop_interval: auto_stop,
			timeout,
			labels: args.name ? { name: args.name } : undefined,
			on_build_log: (chunk) => process.stdout.write(chunk),
		});

		console.log(`\nSandbox created successfully!`);
		console.log(`ID: ${sandbox.id}`);
		console.log(`State: ${sandbox.state}`);

		const work_dir = await sandbox.get_work_dir();
		if (work_dir) {
			console.log(`Working directory: ${work_dir}`);
		}
	},
});
