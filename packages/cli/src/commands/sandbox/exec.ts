/**
 * sandbox exec command
 * Execute a command in a sandbox
 */

import { defineCommand } from 'citty';
import {
	create_daytona_client,
	is_missing_api_key_error,
} from '../../sandbox/index.js';

export default defineCommand({
	meta: {
		name: 'exec',
		description: 'Execute a command in a sandbox',
	},
	args: {
		id: {
			type: 'positional',
			description: 'Sandbox ID or name',
			required: true,
		},
		cmd: {
			type: 'positional',
			description: 'Command to execute',
			required: true,
		},
		cwd: {
			type: 'string',
			description: 'Working directory',
		},
		timeout: {
			type: 'string',
			description: 'Command timeout in seconds (default: 120)',
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
				console.error(`Error: ${error.message}`);
				process.exit(1);
			}
			throw error;
		}
		const sandbox = await daytona.get(args.id);
		const timeout_sec = args.timeout ? parseInt(args.timeout, 10) : 120;

		const result = await sandbox.process.executeCommand(
			args.cmd,
			args.cwd,
			undefined,
			timeout_sec,
		);

		if (args.json) {
			console.log(
				JSON.stringify(
					{
						stdout: result.result,
						exit_code: result.exitCode,
					},
					null,
					2,
				),
			);
		} else {
			if (result.result) {
				process.stdout.write(result.result);
				if (!result.result.endsWith('\n')) {
					console.log();
				}
			}

			if (result.exitCode !== 0) {
				process.exitCode = result.exitCode;
			}
		}
	},
});
