/**
 * sandbox list command
 * List all sandboxes
 */

import { defineCommand } from 'citty';
import {
	create_daytona_client,
	is_missing_api_key_error,
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
				if (args.json) {
					console.error(JSON.stringify({ error: error.message }));
				} else {
					console.error('Error: ' + error.message);
				}
				process.exit(1);
			}
			throw error;
		}
		const limit = parse_int_flag_or_exit(
			args.limit,
			'limit',
			20,
			args.json,
		);

		const result = await daytona.list(undefined, 1, limit);

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
					console.log('  ' + sandbox.id + ' (' + sandbox.state + ')');
				}
			}
		}
	},
});
