/**
 * sandbox delete command
 * Delete a sandbox
 */

import { defineCommand } from 'citty';
import { Daytona } from '@daytonaio/sdk';

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
		const daytona = new Daytona();
		const sandbox = await daytona.get(args.id);
		const timeout = args.timeout ? parseInt(args.timeout, 10) : 60;

		console.log(`Deleting sandbox ${args.id}...`);
		await daytona.delete(sandbox, timeout);
		console.log('Sandbox deleted successfully.');
	},
});
