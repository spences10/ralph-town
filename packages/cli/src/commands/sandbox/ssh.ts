/**
 * sandbox ssh command
 * Get SSH command/token for a sandbox
 */

import { defineCommand } from 'citty';
import {
	create_daytona_client,
	is_missing_api_key_error,
} from '../../sandbox/index.js';
import { parse_int_flag } from '../../core/utils.js';

function mask_token(token: string): string {
	if (token.length <= 4) return '****';
	return `****${token.slice(-4)}`;
}

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

		let expires_minutes: number;
		try {
			expires_minutes = parse_int_flag(args.expires, 'expires', 60);
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			if (args.json) {
				console.error(JSON.stringify({ error: msg }));
			} else {
				console.error('Error: ' + msg);
			}
			process.exit(1);
		}

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
			console.log(`Token: ${mask_token(access.token)}`);
			console.log(`Expires: ${access.expiresAt}`);
		}
	},
});
