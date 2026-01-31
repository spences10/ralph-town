/**
 * sandbox health command
 * Check health status of a running sandbox
 */

import { defineCommand } from 'citty';
import { spawn } from 'child_process';
import {
	BaseCliError,
	create_daytona_client,
	is_missing_api_key_error,
	is_sandbox_not_found,
	output_error,
	SandboxNotFoundError,
	SdkError,
	wrap_sdk_call,
} from '../../sandbox/index.js';

/** Run command via SSH and return exit code + stdout */
async function ssh_exec(
	token: string,
	command: string,
	timeout_ms = 10000,
): Promise<{ exitCode: number; stdout: string }> {
	return new Promise((resolve) => {
		const proc = spawn(
			'ssh',
			[
				'-o',
				'StrictHostKeyChecking=no',
				'-o',
				'BatchMode=yes',
				'-o',
				`ConnectTimeout=${Math.ceil(timeout_ms / 1000)}`,
				`${token}@ssh.app.daytona.io`,
				command,
			],
			{ stdio: ['ignore', 'pipe', 'pipe'] },
		);

		let stdout = '';
		proc.stdout.on('data', (data) => (stdout += data.toString()));
		proc.stderr.on('data', (data) => (stdout += data.toString()));

		const timer = setTimeout(() => {
			proc.kill();
			resolve({ exitCode: -1, stdout: 'timeout' });
		}, timeout_ms);

		proc.on('close', (code) => {
			clearTimeout(timer);
			resolve({ exitCode: code ?? 1, stdout });
		});
	});
}

export default defineCommand({
	meta: {
		name: 'health',
		description: 'Check health status of a sandbox',
	},
	args: {
		id: {
			type: 'positional',
			description: 'Sandbox ID',
			required: true,
		},
		ping: {
			type: 'boolean',
			description: 'Also ping sandbox via SSH (slower but verifies connectivity)',
		},
		json: {
			type: 'boolean',
			description: 'Output as JSON',
		},
	},
	async run({ args }) {
		const sandbox_id = args.id as string;
		const do_ping = args.ping ?? false;
		const json_output = args.json ?? false;

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
					json_output,
				);
				return;
			}
			throw error;
		}

		try {
			// Get sandbox info
			const sandbox = await wrap_sdk_call(() =>
				daytona.get(sandbox_id),
			);

			const state = sandbox.state;
			const is_running = state === 'started';

			let ping_ok: boolean | null = null;
			let ping_latency_ms: number | null = null;

			// Optionally ping via SSH
			if (do_ping && is_running) {
				try {
					const ssh_access = await sandbox.createSshAccess(1);
					const start = Date.now();
					const result = await ssh_exec(
						ssh_access.token,
						'/bin/echo ok',
						10000,
					);
					ping_latency_ms = Date.now() - start;
					ping_ok = result.stdout.includes('ok');
				} catch {
					ping_ok = false;
				}
			}

			const health_result = {
				id: sandbox_id,
				state,
				healthy: is_running,
				...(do_ping && { ping: ping_ok, latency_ms: ping_latency_ms }),
			};

			if (json_output) {
				console.log(JSON.stringify(health_result));
			} else {
				const state_color = is_running ? '\x1b[32m' : '\x1b[33m';
				console.log(`Sandbox: ${sandbox_id}`);
				console.log(`State:   ${state_color}${state}\x1b[0m`);

				if (do_ping) {
					if (ping_ok === null) {
						console.log('Ping:    skipped (not running)');
					} else {
						const ping_status = ping_ok
							? `\x1b[32mok\x1b[0m (${ping_latency_ms}ms)`
							: '\x1b[31mfailed\x1b[0m';
						console.log(`Ping:    ${ping_status}`);
					}
				}
			}
		} catch (error) {
			if (is_sandbox_not_found(error)) {
				output_error(new SandboxNotFoundError(sandbox_id), json_output);
				return;
			}
			if (error instanceof BaseCliError) {
				output_error(error, json_output);
				return;
			}
			output_error(SdkError.from(error), json_output);
		}
	},
});
