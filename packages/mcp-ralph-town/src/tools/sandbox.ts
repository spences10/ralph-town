/**
 * Sandbox MCP Tools
 * Tools for managing Daytona sandboxes via the CLI
 */

import { spawn } from 'child_process';
import { isAbsolute } from 'path';
import { defineTool } from 'tmcp/tool';
import { tool } from 'tmcp/utils';
import * as v from 'valibot';

function get_cli_path(): string {
	const env_path = process.env.RALPH_TOWN_CLI_PATH;
	if (!env_path) {
		return 'ralph-town';
	}
	// Allow 'ralph-town' explicitly, otherwise require absolute path
	if (env_path !== 'ralph-town' && !isAbsolute(env_path)) {
		throw new Error(
			`RALPH_TOWN_CLI_PATH must be an absolute path, got: ${env_path}`,
		);
	}
	return env_path;
}

const cli_path = get_cli_path();

// Per-tool timeout constants
const QUICK_TIMEOUT_MS = 30000; // 30 seconds for quick ops (list, ssh, delete)
const DEFAULT_TIMEOUT_MS = 120000; // 2 minutes for standard ops (create, exec)
const LONG_TIMEOUT_MS = 300000; // 5 minutes for snapshot operations

/**
 * Execute CLI command and return result
 */
function run_cli(
	args: string[],
	timeout_ms: number = DEFAULT_TIMEOUT_MS,
): Promise<{ stdout: string; stderr: string; exit_code: number }> {
	return new Promise((resolve) => {
		const proc = spawn(cli_path, args, {
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		let stdout = '';
		let stderr = '';
		let timed_out = false;

		const timeout_id = setTimeout(() => {
			timed_out = true;
			proc.kill('SIGTERM');
			setTimeout(() => {
				if (!proc.killed) {
					proc.kill('SIGKILL');
				}
			}, 5000);
		}, timeout_ms);

		proc.stdout?.on('data', (data) => {
			stdout += data.toString();
		});

		proc.stderr?.on('data', (data) => {
			stderr += data.toString();
		});

		proc.on('close', (code) => {
			clearTimeout(timeout_id);
			if (timed_out) {
				resolve({
					stdout,
					stderr: `Command timed out after ${timeout_ms}ms\n${stderr}`,
					exit_code: 124,
				});
			} else {
				resolve({ stdout, stderr, exit_code: code ?? 1 });
			}
		});

		proc.on('error', (err) => {
			clearTimeout(timeout_id);
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

		const result = await run_cli(args, DEFAULT_TIMEOUT_MS);

		if (result.exit_code === 0) {
			try {
				const sandbox = JSON.parse(result.stdout);
				return tool.text(JSON.stringify(sandbox, null, 2));
			} catch {
				return tool.text(result.stdout || 'Sandbox created successfully');
			}
		} else {
			return tool.error(
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

		const result = await run_cli(args, QUICK_TIMEOUT_MS);

		if (result.exit_code === 0) {
			try {
				const sandboxes = JSON.parse(result.stdout);
				return tool.text(JSON.stringify(sandboxes, null, 2));
			} catch {
				return tool.text(result.stdout);
			}
		} else {
			return tool.error(
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

		const result = await run_cli(args, QUICK_TIMEOUT_MS);

		if (result.exit_code === 0) {
			try {
				const ssh_info = JSON.parse(result.stdout);
				return tool.text(JSON.stringify(ssh_info, null, 2));
			} catch {
				return tool.text(result.stdout);
			}
		} else {
			return tool.error(
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

		const result = await run_cli(args, QUICK_TIMEOUT_MS);

		if (result.exit_code === 0) {
			try {
				const delete_result = JSON.parse(result.stdout);
				return tool.text(JSON.stringify(delete_result, null, 2));
			} catch {
				return tool.text(result.stdout || `Sandbox ${id} deleted successfully`);
			}
		} else {
			return tool.error(
				`Failed to delete sandbox (exit ${result.exit_code}):\n${result.stderr || result.stdout}`,
			);
		}
	},
);

/**
 * Security: Allowlist of safe command patterns for sandbox_exec
 *
 * Commands are validated against this allowlist before execution.
 * The first word of the command (the binary) must match one of these patterns.
 *
 * NOTE: Future enhancements could include:
 * - Rate limiting (e.g., max 10 commands per minute per sandbox)
 * - Command argument validation for specific commands
 * - Configurable allowlist via environment variable
 */
const ALLOWED_COMMAND_PATTERNS: RegExp[] = [
	// Version control
	/^git$/,
	/^gh$/,
	// File operations (read-only or standard)
	/^ls$/,
	/^cat$/,
	/^head$/,
	/^tail$/,
	/^less$/,
	/^more$/,
	/^find$/,
	/^grep$/,
	/^wc$/,
	/^diff$/,
	/^file$/,
	/^stat$/,
	/^du$/,
	/^df$/,
	// Directory navigation
	/^pwd$/,
	/^cd$/,
	/^tree$/,
	// Text processing
	/^echo$/,
	/^printf$/,
	/^sed$/,
	/^awk$/,
	/^sort$/,
	/^uniq$/,
	/^cut$/,
	/^tr$/,
	/^xargs$/,
	// Package managers and build tools
	/^bun$/,
	/^npm$/,
	/^npx$/,
	/^pnpm$/,
	/^yarn$/,
	/^node$/,
	/^deno$/,
	/^tsx$/,
	/^tsc$/,
	// Common utilities
	/^which$/,
	/^whereis$/,
	/^env$/,
	/^printenv$/,
	/^date$/,
	/^whoami$/,
	/^id$/,
	/^uname$/,
	/^hostname$/,
	// File manipulation (needed for dev work)
	/^mkdir$/,
	/^touch$/,
	/^cp$/,
	/^mv$/,
	/^rm$/,
	// Archive tools
	/^tar$/,
	/^zip$/,
	/^unzip$/,
	/^gzip$/,
	/^gunzip$/,
	// Network tools (for downloading dependencies)
	/^curl$/,
	/^wget$/,
	// Process inspection
	/^ps$/,
	/^top$/,
	/^htop$/,
	// Testing tools
	/^jest$/,
	/^vitest$/,
	/^pytest$/,
	/^cargo$/,
	/^go$/,
	/^make$/,
	// Shell built-ins that might be invoked
	/^true$/,
	/^false$/,
	/^test$/,
	/^\[$/,
	// Allow absolute paths to common binaries
	/^\/usr\/bin\//,
	/^\/bin\//,
	/^\/usr\/local\/bin\//,
];

/**
 * Validate command against allowlist
 * Returns true if command is allowed, false otherwise
 */
function is_command_allowed(cmd: string): boolean {
	const trimmed = cmd.trim();
	if (!trimmed) return false;

	// Extract the first word (command binary)
	const first_word = trimmed.split(/\s+/)[0];
	if (!first_word) return false;

	// Check against allowlist
	return ALLOWED_COMMAND_PATTERNS.some((pattern) =>
		pattern.test(first_word),
	);
}

/**
 * Audit log entry for command execution
 */
interface AuditLogEntry {
	timestamp: string;
	sandbox_id: string;
	command: string;
	allowed: boolean;
	exit_code?: number;
}

/**
 * Log command execution for audit purposes
 * Currently logs to console; could be extended to log to file or external service
 */
function log_command_audit(entry: AuditLogEntry): void {
	const log_line = JSON.stringify({
		...entry,
		type: 'sandbox_exec_audit',
	});
	console.error(`[AUDIT] ${log_line}`);
}

/**
 * sandbox_exec - Execute command in a sandbox
 *
 * SECURITY WARNING: This tool executes arbitrary commands in a sandbox.
 * While sandboxes provide isolation, commands are validated against an
 * allowlist to prevent obviously dangerous operations. All executions
 * are logged for audit purposes.
 */
export const sandbox_exec_tool = defineTool(
	{
		name: 'sandbox_exec',
		description:
			'Execute a command in a Daytona sandbox. SECURITY: Commands are validated against an allowlist of safe patterns (git, ls, cat, npm, bun, etc.). Dangerous commands will be rejected. All commands are logged for audit purposes. Required: id (sandbox ID or name), cmd (command to execute). Options: cwd (working directory), timeout (command timeout in seconds, default 120)',
		schema: v.object({
			id: v.pipe(v.string(), v.minLength(1)),
			cmd: v.pipe(v.string(), v.minLength(1)),
			cwd: v.optional(v.pipe(v.string(), v.minLength(1))),
			timeout: v.optional(v.number()),
		}),
	},
	async ({ id, cmd, cwd, timeout }) => {
		const timestamp = new Date().toISOString();

		// Security: Validate command against allowlist
		const allowed = is_command_allowed(cmd);

		// Log the attempt (regardless of whether it's allowed)
		log_command_audit({
			timestamp,
			sandbox_id: id,
			command: cmd,
			allowed,
		});

		if (!allowed) {
			return tool.error(
				`Command not allowed: "${cmd.split(/\s+/)[0]}". ` +
					'Only allowlisted commands (git, ls, cat, npm, bun, node, etc.) are permitted. ' +
					'See documentation for the full allowlist.',
			);
		}

		const args = ['sandbox', 'exec', id, cmd, '--json'];

		if (cwd) {
			args.push('--cwd', cwd);
		}
		if (timeout !== undefined) {
			args.push('--timeout', String(timeout));
		}

		const result = await run_cli(args, DEFAULT_TIMEOUT_MS);

		// Log the result
		log_command_audit({
			timestamp: new Date().toISOString(),
			sandbox_id: id,
			command: cmd,
			allowed: true,
			exit_code: result.exit_code,
		});

		if (result.exit_code === 0) {
			try {
				const exec_result = JSON.parse(result.stdout);
				return tool.text(JSON.stringify(exec_result, null, 2));
			} catch {
				return tool.text(result.stdout);
			}
		} else {
			return tool.error(
				`Command failed (exit ${result.exit_code}):\n${result.stderr || result.stdout}`,
			);
		}
	},
);

/**
 * sandbox_env_list - List environment variables for a sandbox
 */
export const sandbox_env_list_tool = defineTool(
	{
		name: 'sandbox_env_list',
		description:
			'List environment variables set on a Daytona sandbox. Required: id (sandbox ID or name)',
		schema: v.object({
			id: v.pipe(v.string(), v.minLength(1)),
		}),
	},
	async ({ id }) => {
		const args = ['sandbox', 'env', 'list', id, '--json'];

		const result = await run_cli(args, QUICK_TIMEOUT_MS);

		if (result.exit_code === 0) {
			try {
				const env_vars = JSON.parse(result.stdout);
				return tool.text(JSON.stringify(env_vars, null, 2));
			} catch {
				return tool.text(result.stdout);
			}
		} else {
			return tool.error(
				`Failed to list env vars (exit ${result.exit_code}):\n${result.stderr || result.stdout}`,
			);
		}
	},
);

/**
 * sandbox_env_set - Set environment variable for a sandbox
 */
export const sandbox_env_set_tool = defineTool(
	{
		name: 'sandbox_env_set',
		description:
			'Set an environment variable in a sandbox shell session. Required: id (sandbox ID or name), key (variable name), value (variable value). Note: This only sets the variable in the current shell session. For persistent env vars, use --env flag when creating the sandbox.',
		schema: v.object({
			id: v.pipe(v.string(), v.minLength(1)),
			key: v.pipe(v.string(), v.minLength(1)),
			value: v.string(),
		}),
	},
	async ({ id, key, value }) => {
		const env_var = `${key}=${value}`;
		const args = ['sandbox', 'env', 'set', id, env_var, '--json'];

		const result = await run_cli(args, QUICK_TIMEOUT_MS);

		if (result.exit_code === 0) {
			try {
				const set_result = JSON.parse(result.stdout);
				return tool.text(JSON.stringify(set_result, null, 2));
			} catch {
				return tool.text(result.stdout || `Set ${key}=${value}`);
			}
		} else {
			return tool.error(
				`Failed to set env var (exit ${result.exit_code}):\n${result.stderr || result.stdout}`,
			);
		}
	},
);
