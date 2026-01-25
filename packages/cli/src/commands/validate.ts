/**
 * ralph validate
 * Validate ralph.json config
 */

import { defineCommand } from 'citty';

export default defineCommand({
	meta: {
		name: 'validate',
		description: 'Validate a ralph.json config file',
	},
	args: {
		config: {
			type: 'string',
			alias: 'c',
			description: 'Path to ralph.json',
			default: './ralph.json',
		},
	},
	async run({ args }) {
		const { readFile } = await import('fs/promises');
		const { resolve } = await import('path');

		const config_path = resolve(args.config);

		try {
			const raw = await readFile(config_path, 'utf-8');
			const config = JSON.parse(raw);

			const errors: string[] = [];

			// Required fields
			if (!config.task) {
				errors.push('Missing required field: task');
			}

			// Validate acceptance criteria
			if (config.acceptance_criteria) {
				for (const [i, criterion] of config.acceptance_criteria.entries()) {
					if (!criterion.id) {
						errors.push(`acceptance_criteria[${i}]: missing id`);
					}
					if (!criterion.check_command) {
						errors.push(
							`acceptance_criteria[${i}]: missing check_command`,
						);
					}
				}
			}

			// Validate git config if present
			if (config.git) {
				if (config.git.create_pr && !config.repository?.url) {
					errors.push(
						'git.create_pr requires repository.url to be set',
					);
				}
			}

			if (errors.length > 0) {
				console.error('Validation failed:');
				for (const err of errors) {
					console.error(`  - ${err}`);
				}
				process.exit(1);
			}

			console.log('Config is valid');
			console.log(`  Task: ${config.task.slice(0, 50)}...`);
			console.log(
				`  Criteria: ${config.acceptance_criteria?.length || 0}`,
			);
			console.log(`  Max iterations: ${config.max_iterations || 10}`);
		} catch (err) {
			console.error(`Error reading ${config_path}:`);
			console.error(err instanceof Error ? err.message : err);
			process.exit(1);
		}
	},
});
