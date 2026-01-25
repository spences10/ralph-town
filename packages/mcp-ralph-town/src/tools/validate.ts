import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { defineTool } from 'tmcp/tool';
import { tool } from 'tmcp/utils';
import * as v from 'valibot';

export const validate_tool = defineTool(
	{
		name: 'ralph_validate',
		description: 'Validate a ralph.json config file',
		schema: v.object({
			config: v.optional(v.string(), './ralph.json'),
		}),
	},
	async ({ config }) => {
		const config_path = resolve(config ?? './ralph.json');

		try {
			const raw = await readFile(config_path, 'utf-8');
			const ralph_config = JSON.parse(raw);

			const errors: string[] = [];

			// Must have either task or acceptance_criteria
			if (
				!ralph_config.task &&
				!ralph_config.acceptance_criteria?.length
			) {
				errors.push('Missing required: task or acceptance_criteria');
			}

			// Validate acceptance criteria
			if (ralph_config.acceptance_criteria) {
				for (const [
					i,
					criterion,
				] of ralph_config.acceptance_criteria.entries()) {
					if (!criterion.id) {
						errors.push(`acceptance_criteria[${i}]: missing id`);
					}
					if (!criterion.backpressure && !criterion.check_command) {
						errors.push(
							`acceptance_criteria[${i}]: missing backpressure`,
						);
					}
				}
			}

			// Validate git config
			if (ralph_config.git) {
				if (
					ralph_config.git.create_pr &&
					!ralph_config.repository?.url
				) {
					errors.push(
						'git.create_pr requires repository.url to be set',
					);
				}
			}

			if (errors.length > 0) {
				return tool.text(
					`Validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
				);
			}

			const summary = [
				'Config is valid',
				ralph_config.task
					? `  Task: ${ralph_config.task.slice(0, 50)}...`
					: null,
				`  Criteria: ${ralph_config.acceptance_criteria?.length || 0}`,
				`  Mode: ${ralph_config.execution?.mode || 'sequential'}`,
				`  Runtime: ${ralph_config.execution?.runtime || 'local'}`,
			]
				.filter(Boolean)
				.join('\n');

			return tool.text(summary);
		} catch (err) {
			return tool.text(
				`Error reading ${config_path}: ${err instanceof Error ? err.message : err}`,
			);
		}
	},
);
