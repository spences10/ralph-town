import { defineCommand } from 'citty';
import { parse_int_flag_or_exit } from '../../core/utils.js';
import { exec_sandbox } from '../../operations.js';
import { output_sdk_error } from '../../sandbox/errors.js';

export default defineCommand({
	meta: {
		name: 'exec',
		description: 'Execute a command in a sandbox',
	},
	args: {
		id: {
			type: 'positional',
			description: 'Sandbox ID',
			required: true,
		},
		cmd: {
			type: 'positional',
			description: 'Command to execute',
			required: true,
		},
		cwd: { type: 'string', description: 'Working directory' },
		timeout: {
			type: 'string',
			description: 'Execution timeout in seconds (default: 120)',
		},
		json: { type: 'boolean', description: 'Output as JSON' },
	},
	async run({ args }) {
		const timeout = parse_int_flag_or_exit(
			args.timeout,
			'timeout',
			120,
			args.json,
		);
		try {
			const result = await exec_sandbox(
				args.id,
				args.cmd,
				args.cwd,
				timeout,
			);
			if (args.json) console.log(JSON.stringify(result));
			else if (result.stdout) console.log(result.stdout);
			process.exitCode = result.exit_code;
		} catch (error) {
			output_sdk_error(error, !!args.json);
		}
	},
});
