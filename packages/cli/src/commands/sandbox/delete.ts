/**
 * sandbox delete command
 * Delete a sandbox and clean up resources
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
		name: 'delete',
		description: 'Delete a sandbox',
	},
	args: {
		id: {
			type: 'positional',
			description: 'Sandbox ID to delete',
			required: true,
		},
		timeout: {
			type: 'string',
			description: 'Deletion timeout in seconds (default: 60)',
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

		const timeout = parse_int_flag_or_exit(
			args.timeout,
			'timeout',
			60,
			args.json,
		);

		if (!args.json) {
			console.log('Deleting sandbox ' + args.id + '...');
		}

		try {
			const sandbox = await wrap_sdk_call(
				() => daytona.get(args.id),
				args.id,
			);
			await wrap_sdk_call(() => sandbox.delete(timeout));

			if (args.json) {
				console.log(
					JSON.stringify({
						deleted: true,
						id: args.id,
					}),
				);
			} else {
				console.log('Sandbox deleted successfully');
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
