/**
 * ralph run
 * Execute the Ralph Loop
 */

import { defineCommand } from 'citty';
import { config } from 'dotenv';

config();

export default defineCommand({
	meta: {
		name: 'run',
		description: 'Execute the Ralph Loop on a repository',
	},
	args: {
		config: {
			type: 'string',
			alias: 'c',
			description: 'Path to ralph.json config file',
			default: './ralph.json',
		},
		repo: {
			type: 'string',
			alias: 'r',
			description: 'Repository URL (overrides config)',
		},
		task: {
			type: 'string',
			alias: 't',
			description: 'Task description (overrides config)',
		},
		runtime: {
			type: 'string',
			description: 'Runtime: local, daytona, devcontainer',
			default: 'local',
		},
		'dry-run': {
			type: 'boolean',
			description: 'Validate config without executing',
			default: false,
		},
		json: {
			type: 'boolean',
			description: 'Output results as JSON',
			default: false,
		},
	},
	async run({ args }) {
		const { run_ralph_loop } = await import('@ralph-town/core');
		const { readFile } = await import('fs/promises');
		const { resolve } = await import('path');

		// Load config
		const config_path = resolve(args.config);
		let ralph_config;

		try {
			const raw = await readFile(config_path, 'utf-8');
			ralph_config = JSON.parse(raw);
		} catch (err) {
			if (args.repo && args.task) {
				// Allow running without config if repo + task provided
				ralph_config = {
					task: args.task,
					repository: { url: args.repo },
				};
			} else {
				console.error(
					`Error: Could not load config from ${config_path}`,
				);
				console.error(
					'Either provide a ralph.json or use --repo and --task flags',
				);
				process.exit(1);
			}
		}

		// Apply CLI overrides
		if (args.repo) {
			ralph_config.repository = ralph_config.repository || {};
			ralph_config.repository.url = args.repo;
		}
		if (args.task) {
			ralph_config.task = args.task;
		}

		// Dry run just validates
		if (args['dry-run']) {
			console.log('Config validated:');
			console.log(JSON.stringify(ralph_config, null, 2));
			return;
		}

		// Execute
		const result = await run_ralph_loop(ralph_config, args.runtime as any);

		if (args.json) {
			console.log(JSON.stringify(result, null, 2));
		} else {
			console.log(
				`\nRalph Loop ${result.success ? 'completed' : 'failed'}`,
			);
			if (result.iterations) {
				console.log(`Iterations: ${result.iterations}`);
			}
		}

		process.exit(result.success ? 0 : 1);
	},
});
