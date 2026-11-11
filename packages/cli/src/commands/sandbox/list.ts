import { defineCommand } from 'citty';
import { parse_int_flag_or_exit } from '../../core/utils.js';
import { list_sandboxes } from '../../operations.js';
import { output_sdk_error } from '../../sandbox/errors.js';

export default defineCommand({
	meta: { name: 'list', description: 'List all sandboxes' },
	args: {
		limit: {
			type: 'string',
			description:
				'Maximum number of sandboxes to return (default: 20)',
		},
		json: { type: 'boolean', description: 'Output as JSON' },
	},
	async run({ args }) {
		const limit = parse_int_flag_or_exit(
			args.limit,
			'limit',
			20,
			args.json,
		);
		try {
			const items = await list_sandboxes(limit);
			if (args.json) console.log(JSON.stringify(items));
			else if (!items.length) console.log('No sandboxes found');
			else {
				console.log('Sandboxes:');
				for (const sandbox of items)
					console.log('  ' + sandbox.id + ' (' + sandbox.state + ')');
			}
		} catch (error) {
			output_sdk_error(error, !!args.json);
		}
	},
});
