/**
 * sandbox list command
 * List all sandboxes
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
		name: 'list',
		description: 'List all sandboxes',
	},
	args: {
		limit: {
			type: 'string',
			description: 'Maximum number of sandboxes to return (default: 20)',
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
		const limit = parse_int_flag_or_exit(
			args.limit,
			'limit',
			20,
			args.json,
		);

		try {
			const result = await wrap_sdk_call(() =>
				daytona.list(undefined, 1, limit),
			);

			if (args.json) {
				console.log(
					JSON.stringify(
						result.items.map((s) => ({
							id: s.id,
							state: s.state,
						})),
					),
				);
			} else {
				if (result.items.length === 0) {
					console.log('No sandboxes found');
				} else {
					console.log('Sandboxes:');
					for (const sandbox of result.items) {
						console.log(
							'  ' + sandbox.id + ' (' + sandbox.state + ')',
						);
					}
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
