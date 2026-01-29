/**
 * sandbox delete command
 * Delete a sandbox
 */

import { defineCommand } from 'citty';
import {
	create_daytona_client,
	is_missing_api_key_error,
} from '../../sandbox/index.js';

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
		const timeout = args.timeout ? parseInt(args.timeout, 10) : 60;

		console.log(`Deleting sandbox ${args.id}...`);
		await daytona.delete(sandbox, timeout);
		console.log('Sandbox deleted successfully.');
	},
});
