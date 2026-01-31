/**
 * sandbox ssh command
 * Get SSH access credentials for a sandbox
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

const REDACTED = '***REDACTED***';

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
			description: 'Output as JSON',
		},
		'show-secrets': {
			type: 'boolean',
			description: 'Show unmasked tokens in output',
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

		const expires_minutes = parse_int_flag_or_exit(
			args.expires,
			'expires',
			60,
			args.json,
		);

		try {
			const sandbox = await wrap_sdk_call(
				() => daytona.get(args.id),
				args.id,
			);
			const access = await wrap_sdk_call(() =>
				sandbox.createSshAccess(expires_minutes),
			);
			const show_secrets = args['show-secrets'];

			if (args.json) {
				const display_token = show_secrets
					? access.token
					: REDACTED;
				console.log(
					JSON.stringify({
						token: display_token,
						token_masked: !show_secrets,
						command:
							'ssh ' + display_token + '@ssh.app.daytona.io',
						expires_at: new Date(
							Date.now() + expires_minutes * 60 * 1000,
						).toISOString(),
					}),
				);
			} else {
				if (show_secrets) {
					console.log('SSH Access for sandbox ' + args.id);
					console.log('Token: ' + access.token);
					console.log(
						'Command: ssh ' +
							access.token +
							'@ssh.app.daytona.io',
					);
					console.log(
						'Expires in: ' + expires_minutes + ' minutes',
					);
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
					console.log(
						'Expires in: ' + expires_minutes + ' minutes',
					);
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
