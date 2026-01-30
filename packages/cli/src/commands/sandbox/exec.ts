/**
 * sandbox exec command
 * Execute a command in a sandbox
 */

import { defineCommand } from 'citty';
import {
	create_daytona_client,
	is_missing_api_key_error,
} from '../../sandbox/index.js';
import { parse_int_flag } from '../../core/utils.js';

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
		let timeout_sec: number;
		try {
			timeout_sec = parse_int_flag(args.timeout, 'timeout', 120);
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			if (args.json) {
				console.error(JSON.stringify({ error: msg }));
			} else {
				console.error('Error: ' + msg);
			}
			process.exit(1);
		}

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
