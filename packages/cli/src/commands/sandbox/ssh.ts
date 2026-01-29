/**
 * sandbox ssh command
 * Get SSH command/token for a sandbox
 */

import { defineCommand } from 'citty';
import { Daytona } from '@daytonaio/sdk';

export default defineCommand({
	meta: {
		name: 'ssh',
		description: 'Get SSH command/token for a sandbox',
	},
	args: {
		id: {
			type: 'positional',
			description: 'Sandbox ID or name',
			required: true,
		},
		expires: {
			type: 'string',
			description: 'Token expiration in minutes (default: 60)',
		},
		json: {
			type: 'boolean',
			description: 'Output as JSON',
		},
	},
	async run({ args }) {
		const daytona = new Daytona();
		const sandbox = await daytona.get(args.id);

		const expires_minutes = args.expires
			? parseInt(args.expires, 10)
			: 60;

		const access = await sandbox.createSshAccess(expires_minutes);

		if (args.json) {
			console.log(
				JSON.stringify(
					{
						token: access.token,
						command: access.sshCommand,
						expires_at: access.expiresAt,
					},
					null,
					2,
				),
			);
		} else {
			console.log(`SSH Command:\n${access.sshCommand}\n`);
			console.log(`Token: ${access.token}`);
			console.log(`Expires: ${access.expiresAt}`);
		}
	},
});
