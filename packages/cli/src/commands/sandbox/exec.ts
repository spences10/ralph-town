/**
 * sandbox exec command
 * Execute a command in a running sandbox
 */

import { defineCommand } from 'citty';
import {
	BaseCliError,
	create_daytona_client,
	is_missing_api_key_error,
	output_error,
	SdkError,
	wrap_sdk_call,
} from '../../sandbox/index.js';
import { parse_int_flag_or_exit } from '../../core/utils.js';

export default defineCommand({
	meta: {
		name: 'exec',
		description: 'Execute a command in a sandbox',
	},
	args: {
		id: {
			type: 'positional',
			description: 'Sandbox ID',
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
			description: 'Execution timeout in seconds (default: 120)',
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
				output_error(
					{
						error: true,
						code: 'MISSING_API_KEY',
						message: (error as Error).message,
					},
					!!args.json,
				);
				return;
			}
			throw error;
		}

		const timeout_sec = parse_int_flag_or_exit(
			args.timeout,
			'timeout',
			120,
			args.json,
		);

		try {
			const sandbox = await wrap_sdk_call(
				() => daytona.get(args.id),
				args.id,
			);

			// KNOWN ISSUE: executeCommand returns exit code -1 with empty
			// stdout on snapshot-based sandboxes. This is a Daytona SDK bug.
			// Workaround: Use SSH instead (see sandbox ssh command).
			// Upstream issue: https://github.com/daytonaio/daytona/issues/2283
			const result = await wrap_sdk_call(() =>
				sandbox.process.executeCommand(
					args.cmd,
					args.cwd,
					undefined,
					timeout_sec,
				),
			);

			if (args.json) {
				console.log(
					JSON.stringify({
						exit_code: result.exitCode,
						stdout: result.result,
					}),
				);
			} else {
				if (result.result) {
					console.log(result.result);
				}
				if (result.exitCode !== 0) {
					process.exitCode = result.exitCode;
					return;
				}
			}
		} catch (error) {
			if (error instanceof BaseCliError) {
				output_error(error, !!args.json);
				return;
			}
			output_error(SdkError.from(error), !!args.json);
		}
	},
});
