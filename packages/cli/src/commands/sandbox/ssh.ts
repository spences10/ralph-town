/**
 * sandbox ssh command
 * Get SSH access credentials for a sandbox
 */

import { defineCommand } from 'citty';
import {
	create_daytona_client,
	is_missing_api_key_error,
} from '../../sandbox/index.js';
import { parse_int_flag_or_exit } from '../../core/utils.js';

function mask_token(token: string): string {
	if (token.length <= 4) return '****';
	return token.slice(0, 4) + '****' + token.slice(-4);
}

export default defineCommand({
	meta: {
		name: 'ssh',
		description: 'Get SSH access to a sandbox',
	},
	args: {
		id: {
			type: 'positional',
			description: 'Sandbox ID',
			required: true,
		},
		expires: {
			type: 'string',
			description: 'Token expiration in minutes (default: 60)',
		},
		json: {
			type: 'boolean',
			description: 'Output as JSON (includes unmasked token)',
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
				process.exitCode = 1;
				return;
			}
			throw error;
		}
		const sandbox = await daytona.get(args.id);

		const expires_minutes = parse_int_flag_or_exit(
			args.expires,
			'expires',
			60,
			args.json,
		);

		const access = await sandbox.createSshAccess(expires_minutes);

		if (args.json) {
			console.log(
				JSON.stringify({
					token: access.token,
					command: 'ssh ' + access.token + '@ssh.app.daytona.io',
					expires_at: new Date(
						Date.now() + expires_minutes * 60 * 1000,
					).toISOString(),
				}),
			);
		} else {
			// Mask token in human-readable output to prevent accidental exposure
			const masked = mask_token(access.token);
			console.log('SSH Access for sandbox ' + args.id);
			console.log('Token: ' + masked + ' (use --json for full token)');
			console.log(
				'Command: ssh ' + masked + '@ssh.app.daytona.io',
			);
			console.log('Expires in: ' + expires_minutes + ' minutes');
		}
	},
});
