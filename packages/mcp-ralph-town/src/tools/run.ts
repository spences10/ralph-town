import { spawn } from 'child_process';
import { defineTool } from 'tmcp/tool';
import { tool } from 'tmcp/utils';
import * as v from 'valibot';

export const run_tool = defineTool(
	{
		name: 'ralph_run',
		description:
			'Execute the Ralph Loop on a repository. Runs acceptance criteria until they pass.',
		schema: v.object({
			config: v.optional(v.string(), './ralph.json'),
			runtime: v.optional(
				v.picklist(['local', 'daytona', 'devcontainer']),
				'local',
			),
			dry_run: v.optional(v.boolean(), false),
		}),
	},
	async ({ config, runtime, dry_run }) => {
		const args = ['ralph-town', 'run'];

		if (config) {
			args.push('--config', config);
		}
		if (runtime) {
			args.push('--runtime', runtime);
		}
		if (dry_run) {
			args.push('--dry-run');
		}

		return new Promise((resolve) => {
			const proc = spawn('npx', args, {
				stdio: ['ignore', 'pipe', 'pipe'],
				shell: true,
			});

			let stdout = '';
			let stderr = '';

			proc.stdout?.on('data', (data) => {
				stdout += data.toString();
			});

			proc.stderr?.on('data', (data) => {
				stderr += data.toString();
			});

			proc.on('close', (code) => {
				if (code === 0) {
					resolve(
						tool.text(stdout || 'Ralph loop completed successfully'),
					);
				} else {
					resolve(
						tool.text(
							`Ralph loop failed (exit ${code}):\n${stderr || stdout}`,
						),
					);
				}
			});

			proc.on('error', (err) => {
				resolve(
					tool.text(`Failed to start ralph-town: ${err.message}`),
				);
			});
		});
	},
);
