import { defineCommand } from 'citty';
import {
	list_sandbox_env,
	set_sandbox_env,
} from '../../operations.js';
import {
	output_error,
	output_sdk_error,
} from '../../sandbox/errors.js';

const list_command = defineCommand({
	meta: {
		name: 'list',
		description: 'List current environment variables for a sandbox',
	},
	args: {
		id: {
			type: 'positional',
			description: 'Sandbox ID or name',
			required: true,
		},
		json: { type: 'boolean', description: 'Output as JSON' },
	},
	async run({ args }) {
		try {
			const env = await list_sandbox_env(args.id);
			if (args.json) console.log(JSON.stringify(env));
			else {
				const keys = Object.keys(env);
				console.log(
					keys.length
						? 'Environment variables:'
						: 'No environment variables set',
				);
				for (const key of keys.sort())
					console.log('  ' + key + '=' + env[key]);
			}
		} catch (error) {
			output_sdk_error(error, !!args.json);
		}
	},
});

const set_command = defineCommand({
	meta: {
		name: 'set',
		description:
			'Set an environment variable for newly spawned sandbox processes',
	},
	args: {
		id: {
			type: 'positional',
			description: 'Sandbox ID or name',
			required: true,
		},
		env_var: {
			type: 'positional',
			description: 'Environment variable in KEY=VALUE format',
			required: true,
		},
		json: { type: 'boolean', description: 'Output as JSON' },
	},
	async run({ args }) {
		const separator = args.env_var.indexOf('=');
		if (separator < 1) {
			output_error(
				{
					error: true,
					code: separator === -1 ? 'INVALID_FORMAT' : 'INVALID_KEY',
					message: 'Use KEY=VALUE with a non-empty key',
				},
				!!args.json,
			);
			return;
		}
		const key = args.env_var.slice(0, separator);
		const value = args.env_var.slice(separator + 1);
		try {
			const result = await set_sandbox_env(args.id, key, value);
			if (args.json) console.log(JSON.stringify(result));
			else {
				console.log('Set ' + key + '=' + value);
				console.log(result.note);
			}
		} catch (error) {
			output_sdk_error(error, !!args.json);
		}
	},
});

export default defineCommand({
	meta: {
		name: 'env',
		description: 'Manage sandbox environment variables',
	},
	subCommands: { list: list_command, set: set_command },
});
