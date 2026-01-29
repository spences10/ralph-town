/**
 * Sandbox MCP Tools
 * Tools for managing Daytona sandboxes via the CLI
 */

import { spawn } from 'child_process';
import { defineTool } from 'tmcp/tool';
import { tool } from 'tmcp/utils';
import * as v from 'valibot';

const cli_path = process.env.RALPH_TOWN_CLI_PATH || 'ralph-town';

/**
 * Execute CLI command and return result
 */
function run_cli(
	args: string[],
): Promise<{ stdout: string; stderr: string; exit_code: number }> {
	return new Promise((resolve) => {
		const proc = spawn(cli_path, args, {
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		let stdout = '';
		let stderr = '';

		proc.stdout?.on('data', (data) => {
			stdout += data.toString();
		});

		proc.stderr?.on('data', (data) => {
			stderr += data.toString();
		});

		proc.on('close', (code) => {
			resolve({ stdout, stderr, exit_code: code ?? 1 });
		});

		proc.on('error', (err) => {
			resolve({
				stdout: '',
				stderr: err.message,
				exit_code: 1,
			});
		});
	});
}

/**
 * sandbox_create - Create a new Daytona sandbox
 */
export const sandbox_create_tool = defineTool(
	{
		name: 'sandbox_create',
		description:
			'Create a new Daytona sandbox with pre-baked image (node:22-slim with git, typescript, tsx). Options: image (base Docker image), name (sandbox label), auto_stop (minutes, 0 to disable), timeout (seconds, default 120), snapshot (snapshot ID to create from), env (environment variables as KEY=value)',
		schema: v.object({
			image: v.optional(v.pipe(v.string(), v.minLength(1))),
			name: v.optional(v.pipe(v.string(), v.minLength(1))),
			auto_stop: v.optional(v.number()),
			timeout: v.optional(v.number()),
			snapshot: v.optional(v.pipe(v.string(), v.minLength(1))),
			env: v.optional(v.array(v.pipe(v.string(), v.minLength(1)))),
		}),
	},
	async ({ image, name, auto_stop, timeout, snapshot, env }) => {
		const args = ['sandbox', 'create', '--json'];

		if (image) {
			args.push('--image', image);
		}
		if (name) {
			args.push('--name', name);
		}
		if (auto_stop !== undefined) {
			args.push('--auto-stop', String(auto_stop));
		}
		if (timeout !== undefined) {
			args.push('--timeout', String(timeout));
		}
		if (snapshot) {
			args.push('--snapshot', snapshot);
		}
		if (env && env.length > 0) {
			for (const e of env) {
				args.push('--env', e);
			}
		}

		const result = await run_cli(args);

		if (result.exit_code === 0) {
			try {
				const sandbox = JSON.parse(result.stdout);
				return tool.text(JSON.stringify(sandbox, null, 2));
			} catch {
				return tool.text(result.stdout || 'Sandbox created successfully');
			}
		} else {
			return tool.text(
				`Failed to create sandbox (exit ${result.exit_code}):\n${result.stderr || result.stdout}`,
			);
		}
	},
);

/**
 * sandbox_list - List active sandboxes
 */
export const sandbox_list_tool = defineTool(
	{
		name: 'sandbox_list',
		description:
			'List active Daytona sandboxes. Options: limit (max sandboxes to list, default 20)',
		schema: v.object({
			limit: v.optional(v.number()),
		}),
	},
	async ({ limit }) => {
		const args = ['sandbox', 'list', '--json'];

		if (limit !== undefined) {
			args.push('--limit', String(limit));
		}

		const result = await run_cli(args);

		if (result.exit_code === 0) {
			try {
				const sandboxes = JSON.parse(result.stdout);
				return tool.text(JSON.stringify(sandboxes, null, 2));
			} catch {
				return tool.text(result.stdout);
			}
		} else {
			return tool.text(
				`Failed to list sandboxes (exit ${result.exit_code}):\n${result.stderr || result.stdout}`,
			);
		}
	},
);

/**
 * sandbox_ssh - Get SSH credentials for a sandbox
 */
export const sandbox_ssh_tool = defineTool(
	{
		name: 'sandbox_ssh',
		description:
			'Get SSH command and token for connecting to a sandbox. Required: id (sandbox ID or name). Options: expires (token expiration in minutes, default 60)',
		schema: v.object({
			id: v.pipe(v.string(), v.minLength(1)),
			expires: v.optional(v.number()),
		}),
	},
	async ({ id, expires }) => {
		const args = ['sandbox', 'ssh', id, '--json'];

		if (expires !== undefined) {
			args.push('--expires', String(expires));
		}

		const result = await run_cli(args);

		if (result.exit_code === 0) {
			try {
				const ssh_info = JSON.parse(result.stdout);
				return tool.text(JSON.stringify(ssh_info, null, 2));
			} catch {
				return tool.text(result.stdout);
			}
		} else {
			return tool.text(
				`Failed to get SSH access (exit ${result.exit_code}):\n${result.stderr || result.stdout}`,
			);
		}
	},
);

/**
 * sandbox_delete - Delete a sandbox
 */
export const sandbox_delete_tool = defineTool(
	{
		name: 'sandbox_delete',
		description:
			'Delete a Daytona sandbox. Required: id (sandbox ID or name). Options: timeout (deletion timeout in seconds, default 60)',
		schema: v.object({
			id: v.pipe(v.string(), v.minLength(1)),
			timeout: v.optional(v.number()),
		}),
	},
	async ({ id, timeout }) => {
		const args = ['sandbox', 'delete', id, '--json'];

		if (timeout !== undefined) {
			args.push('--timeout', String(timeout));
		}

		const result = await run_cli(args);

		if (result.exit_code === 0) {
			try {
				const delete_result = JSON.parse(result.stdout);
				return tool.text(JSON.stringify(delete_result, null, 2));
			} catch {
				return tool.text(result.stdout || `Sandbox ${id} deleted successfully`);
			}
		} else {
			return tool.text(
				`Failed to delete sandbox (exit ${result.exit_code}):\n${result.stderr || result.stdout}`,
			);
		}
	},
);

/**
 * sandbox_exec - Execute command in a sandbox
 */
export const sandbox_exec_tool = defineTool(
	{
		name: 'sandbox_exec',
		description:
			'Execute a command in a Daytona sandbox. Required: id (sandbox ID or name), cmd (command to execute). Options: cwd (working directory), timeout (command timeout in seconds, default 120)',
		schema: v.object({
			id: v.pipe(v.string(), v.minLength(1)),
			cmd: v.pipe(v.string(), v.minLength(1)),
			cwd: v.optional(v.pipe(v.string(), v.minLength(1))),
			timeout: v.optional(v.number()),
		}),
	},
	async ({ id, cmd, cwd, timeout }) => {
		const args = ['sandbox', 'exec', id, cmd, '--json'];

		if (cwd) {
			args.push('--cwd', cwd);
		}
		if (timeout !== undefined) {
			args.push('--timeout', String(timeout));
		}

		const result = await run_cli(args);

		if (result.exit_code === 0) {
			try {
				const exec_result = JSON.parse(result.stdout);
				return tool.text(JSON.stringify(exec_result, null, 2));
			} catch {
				return tool.text(result.stdout);
			}
		} else {
			return tool.text(
				`Command failed (exit ${result.exit_code}):\n${result.stderr || result.stdout}`,
			);
		}
	},
);
