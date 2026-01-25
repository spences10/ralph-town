/**
 * ralph init
 * Create a ralph.json config file
 */

import { defineCommand } from 'citty';

export default defineCommand({
	meta: {
		name: 'init',
		description: 'Create a ralph.json config file in current directory',
	},
	args: {
		force: {
			type: 'boolean',
			alias: 'f',
			description: 'Overwrite existing ralph.json',
			default: false,
		},
	},
	async run({ args }) {
		const { writeFile, access } = await import('fs/promises');
		const { resolve } = await import('path');

		const config_path = resolve('./ralph.json');

		// Check if exists
		try {
			await access(config_path);
			if (!args.force) {
				console.error(
					'ralph.json already exists. Use --force to overwrite.',
				);
				process.exit(1);
			}
		} catch {
			// File doesn't exist, good to proceed
		}

		const template = {
			task: 'Describe your task here',
			repository: {
				url: 'https://github.com/owner/repo',
				branch: 'main',
			},
			acceptance_criteria: [
				{
					id: 'builds',
					description: 'Project builds without errors',
					check_command: 'npm run build',
				},
				{
					id: 'tests',
					description: 'All tests pass',
					check_command: 'npm test',
				},
			],
			git: {
				feature_branch: 'feat/ralph-changes',
				create_pr: false,
			},
			max_iterations: 5,
		};

		await writeFile(config_path, JSON.stringify(template, null, '\t'));
		console.log('Created ralph.json');
		console.log('Edit it with your task and repository details.');
	},
});
