/**
 * sandbox ssh command
 * Get SSH access credentials for a sandbox
 */

import { defineCommand } from 'citty';
import { parse_int_flag_or_exit } from '../../core/utils.js';
import { get_ssh_access } from '../../operations.js';
import { output_sdk_error } from '../../sandbox/errors.js';

export const REDACTED = '***REDACTED***';

export function mask_token(token: string): string {
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
			description: 'Output as JSON',
		},
		'show-secrets': {
			type: 'boolean',
			description: 'Show unmasked tokens in output',
		},
	},
	async run({ args }) {
		const expires_minutes = parse_int_flag_or_exit(
			args.expires,
			'expires',
			60,
			args.json,
		);

		try {
			const access = await get_ssh_access(args.id, expires_minutes);
			const show_secrets = args['show-secrets'];

			if (args.json) {
				const display_token = show_secrets ? access.token : REDACTED;
				console.log(
					JSON.stringify({
						token: display_token,
						token_masked: !show_secrets,
						command: 'ssh ' + display_token + '@ssh.app.daytona.io',
						expires_at: new Date(access.expiresAt).toISOString(),
					}),
				);
			} else {
				if (show_secrets) {
					console.log('SSH Access for sandbox ' + args.id);
					console.log('Token: ' + access.token);
					console.log(
						'Command: ssh ' + access.token + '@ssh.app.daytona.io',
					);
					console.log('Expires in: ' + expires_minutes + ' minutes');
				} else {
					const masked = mask_token(access.token);
					console.log('SSH Access for sandbox ' + args.id);
					console.log(
						'Token: ' +
							masked +
							' (use --show-secrets for full token)',
					);
					console.log(
						'Command: ssh ' + masked + '@ssh.app.daytona.io',
					);
					console.log('Expires in: ' + expires_minutes + ' minutes');
				}
			}
		} catch (error) {
			output_sdk_error(error, !!args.json);
		}
	},
});
