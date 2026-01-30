/**
 * sandbox delete command
 * Delete a sandbox
 */

import { defineCommand } from 'citty';
import {
	create_daytona_client,
	is_missing_api_key_error,
} from '../../sandbox/index.js';
import { parse_int_flag } from '../../core/utils.js';

export default defineCommand({
	meta: {
		name: 'delete',
		description: 'Delete a sandbox',
	},
	args: {
		id: {
			type: 'positional',
			description: 'Sandbox ID or name',
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
		let timeout: number;
		try {
			timeout = parse_int_flag(args.timeout, 'timeout', 60);
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			if (args.json) {
				console.error(JSON.stringify({ error: msg }));
			} else {
				console.error('Error: ' + msg);
			}
			process.exit(1);
		}

		if (!args.json) {
			console.log('Deleting sandbox ' + args.id + '...');
		}
		await daytona.delete(sandbox, timeout);
		
		if (args.json) {
			console.log(JSON.stringify({ id: args.id, deleted: true }));
		} else {
			console.log('Sandbox deleted successfully.');
		}
	},
});
