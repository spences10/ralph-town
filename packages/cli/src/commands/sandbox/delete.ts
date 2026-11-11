import { defineCommand } from 'citty';
import { parse_int_flag_or_exit } from '../../core/utils.js';
import { delete_sandbox } from '../../operations.js';
import { output_sdk_error } from '../../sandbox/errors.js';

export default defineCommand({
	meta: { name: 'delete', description: 'Delete a sandbox' },
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
		json: { type: 'boolean', description: 'Output as JSON' },
	},
	async run({ args }) {
		const timeout = parse_int_flag_or_exit(
			args.timeout,
			'timeout',
			60,
			args.json,
		);
		if (!args.json)
			console.log('Deleting sandbox ' + args.id + '...');
		try {
			const result = await delete_sandbox(args.id, timeout);
			console.log(
				args.json
					? JSON.stringify(result)
					: 'Sandbox deleted successfully',
			);
		} catch (error) {
			output_sdk_error(error, !!args.json);
		}
	},
});
