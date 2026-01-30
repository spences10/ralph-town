/**
 * sandbox list command
 * List active sandboxes
 */

import { defineCommand } from 'citty';
import {
	create_daytona_client,
	is_missing_api_key_error,
} from '../../sandbox/index.js';
import { parse_int_flag } from '../../core/utils.js';

export default defineCommand({
	meta: {
		name: 'list',
		description: 'List active sandboxes',
	},
	args: {
		json: {
			type: 'boolean',
			description: 'Output as JSON',
		},
		limit: {
			type: 'string',
			description: 'Maximum number of sandboxes to list (default: 20)',
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
		let limit: number;
		try {
			limit = parse_int_flag(args.limit, 'limit', 20);
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			if (args.json) {
				console.error(JSON.stringify({ error: msg }));
			} else {
				console.error('Error: ' + msg);
			}
			process.exit(1);
		}

		const result = await daytona.list(undefined, 1, limit);

		if (args.json) {
			const items = result.items.map((s) => ({
				id: s.id,
				name: s.name,
				state: s.state,
				cpu: s.cpu,
				memory: s.memory,
				created_at: s.createdAt,
			}));
			console.log(JSON.stringify(items, null, 2));
		} else {
			if (result.items.length === 0) {
				console.log('No sandboxes found.');
				return;
			}

			console.log('Sandboxes:\n');
			console.log(
				'ID'.padEnd(40) +
					'NAME'.padEnd(20) +
					'STATE'.padEnd(12) +
					'CPU'.padEnd(6) +
					'MEM',
			);
			console.log('-'.repeat(85));

			for (const sandbox of result.items) {
				const id = sandbox.id.slice(0, 38);
				const name = (sandbox.name || '-').slice(0, 18);
				const state = (sandbox.state || '-').slice(0, 10);
				const cpu = String(sandbox.cpu || '-');
				const mem = sandbox.memory ? `${sandbox.memory}GB` : '-';

				console.log(
					id.padEnd(40) +
						name.padEnd(20) +
						state.padEnd(12) +
						cpu.padEnd(6) +
						mem,
				);
			}

			console.log(`\nTotal: ${result.items.length} sandbox(es)`);
		}
	},
});
