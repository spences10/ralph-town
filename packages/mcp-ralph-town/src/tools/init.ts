import { access, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { defineTool } from 'tmcp/tool';
import { tool } from 'tmcp/utils';
import * as v from 'valibot';

export const init_tool = defineTool(
	{
		name: 'ralph_init',
		description:
			'Create a ralph.json config file in current directory',
		schema: v.object({
			force: v.optional(v.boolean(), false),
			path: v.optional(v.string(), './ralph.json'),
		}),
	},
	async ({ force, path }) => {
		const config_path = resolve(path ?? './ralph.json');

		// Check if exists
		try {
			await access(config_path);
			if (!force) {
				return tool.text(
					`ralph.json already exists at ${config_path}. Use force: true to overwrite.`,
				);
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
					backpressure: 'npm run build',
				},
				{
					id: 'tests',
					description: 'All tests pass',
					backpressure: 'npm test',
				},
			],
			execution: {
				mode: 'sequential',
				runtime: 'local',
				model: 'haiku',
			},
			git: {
				feature_branch: 'feat/ralph-changes',
				create_pr: false,
			},
			max_iterations_per_criterion: 3,
		};

		await writeFile(
			config_path,
			JSON.stringify(template, null, '\t'),
		);
		return tool.text(`Created ralph.json at ${config_path}`);
	},
);
