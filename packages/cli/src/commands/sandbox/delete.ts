/**
 * sandbox delete command
 * Delete a sandbox and clean up resources
 */

import { defineCommand } from 'citty';
import {
	create_daytona_client,
	is_missing_api_key_error,
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
				if (args.json) {
					console.error(JSON.stringify({ error: error.message }));
				} else {
					console.error('Error: ' + error.message);
				}
				process.exit(1);
			}
			throw error;
		}
		const sandbox = await daytona.get(args.id);
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
			await sandbox.delete(timeout);

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
			const message =
				error instanceof Error ? error.message : 'Unknown error';
			if (args.json) {
				console.error(
					JSON.stringify({
						error: message,
						id: args.id,
					}),
				);
			} else {
				console.error('Error deleting sandbox: ' + message);
			}
			process.exit(1);
		}
	},
});
