/**
 * Shared host-side operations for the CLI and MCP server.
 * This entry point has no CLI startup or process-output side effects.
 */
import type { Sandbox as DaytonaSandbox } from '@daytona/sdk';
import { create_daytona_client } from './sandbox/client.js';
import { wrap_sdk_call } from './sandbox/errors.js';

export { normalize_sandbox_env } from './core/env.js';
export { create_sandbox } from './sandbox/create.js';
export { run_sandbox } from './sandbox/run.js';
export type { RunOptions } from './sandbox/run.js';
export type { CreateSandboxOptions } from './sandbox/types.js';

export async function get_sandbox(id: string) {
	const daytona = create_daytona_client();
	return wrap_sdk_call(() => daytona.get(id), id);
}

export async function list_sandboxes(limit = 20) {
	const daytona = create_daytona_client();
	return wrap_sdk_call(async () => {
		const items = [];
		for await (const sandbox of daytona.list({ limit })) {
			items.push({ id: sandbox.id, state: sandbox.state });
			if (items.length >= limit) break;
		}
		return items;
	});
}

export async function exec_sandbox(
	id: string,
	command: string,
	cwd?: string,
	timeout = 120,
) {
	const sandbox = await get_sandbox(id);
	const result = await wrap_sdk_call(() =>
		sandbox.process.executeCommand(command, cwd, undefined, timeout),
	);
	// The direct API combines output. run_sandbox preserves separate streams.
	return { exit_code: result.exitCode, stdout: result.result };
}

export async function delete_sandbox(id: string, timeout = 60) {
	const sandbox = await get_sandbox(id);
	await wrap_sdk_call(() => sandbox.delete(timeout));
	return { deleted: true, id };
}

export async function get_ssh_access(
	id: string,
	expires = 60,
): ReturnType<DaytonaSandbox['createSshAccess']> {
	const sandbox = await get_sandbox(id);
	return wrap_sdk_call(() => sandbox.createSshAccess(expires));
}

export async function list_sandbox_env(id: string) {
	const result = await exec_sandbox(id, 'printenv -0');
	if (result.exit_code !== 0)
		throw new Error('Failed to read sandbox environment');
	// Read the daemon's current environment, not stale creation-time metadata.
	return Object.fromEntries(
		result.stdout
			.split('\0')
			.filter(Boolean)
			.map((entry) => {
				const separator = entry.indexOf('=');
				return [
					entry.slice(0, separator),
					entry.slice(separator + 1),
				];
			}),
	);
}

export async function set_sandbox_env(
	id: string,
	key: string,
	value: string,
) {
	const sandbox = await get_sandbox(id);
	await wrap_sdk_call(() => sandbox.updateEnv({ [key]: value }));
	return {
		success: true,
		key,
		value,
		note: 'New processes, sessions and PTYs inherit this value. Already-running processes are unchanged.',
	};
}
