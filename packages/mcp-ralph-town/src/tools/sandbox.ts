import {
	create_sandbox,
	delete_sandbox,
	exec_sandbox,
	get_ssh_access,
	list_sandbox_env,
	list_sandboxes,
	normalize_sandbox_env,
	run_sandbox,
	set_sandbox_env,
} from 'ralph-town/operations';
import { defineTool } from 'tmcp/tool';
import { tool } from 'tmcp/utils';
import * as v from 'valibot';

// Preserve the existing MCP command filter. It checks only the first word,
// not shell syntax, and is not a security boundary.
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
	/^npm$/,
	/^npx$/,
	/^pnpm$/,
	/^pnpx$/,
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
export function is_command_allowed(cmd: string): boolean {
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

const nonempty = v.pipe(v.string(), v.minLength(1));
const env_schema = v.optional(
	v.array(v.pipe(v.string(), v.regex(/^[^=]+=/))),
);
const create_fields = {
	image: v.optional(nonempty),
	name: v.optional(nonempty),
	auto_stop: v.optional(v.number()),
	timeout: v.optional(v.number()),
	snapshot: v.optional(nonempty),
	env: env_schema,
};

function env_from_entries(entries: string[] = []) {
	return normalize_sandbox_env(
		Object.fromEntries(
			entries.map((entry) => {
				const separator = entry.indexOf('=');
				return [
					entry.slice(0, separator),
					entry.slice(separator + 1),
				];
			}),
		),
	);
}

/** One schema and handler for direct MCP calls and Code Mode calls. */
function define_operation<
	S extends v.GenericSchema<Record<string, unknown>>,
>(
	name: string,
	description: string,
	schema: S,
	handler: (
		args: v.InferOutput<S>,
		signal?: AbortSignal,
	) => Promise<unknown>,
): {
	name: string;
	description: string;
	schema: v.GenericSchema<Record<string, unknown>>;
	execute(input: unknown, signal?: AbortSignal): Promise<unknown>;
} {
	return {
		name,
		description,
		schema,
		execute(input: unknown, signal?: AbortSignal) {
			signal?.throwIfAborted();
			return handler(v.parse(schema, input), signal);
		},
	};
}

export const sandbox_operations = [
	define_operation(
		'sandbox_create',
		'Create a Daytona sandbox. Default image includes Node, git and pnpm. env entries use KEY=value. ephemeral deletes on stop.',
		v.object({
			...create_fields,
			ephemeral: v.optional(v.boolean()),
		}),
		async (
			{ image, name, auto_stop, timeout, snapshot, env, ephemeral },
			signal,
		) => {
			const sandbox = await create_sandbox({
				image,
				name,
				timeout,
				snapshot,
				ephemeral,
				auto_stop_interval: auto_stop,
				env_vars: env_from_entries(env),
			});
			try {
				signal?.throwIfAborted();
				const work_dir = await sandbox.get_work_dir();
				signal?.throwIfAborted();
				return {
					id: sandbox.id,
					state: sandbox.state,
					work_dir: work_dir ?? null,
				};
			} catch (error) {
				try {
					await sandbox.delete();
				} catch (cleanup_error) {
					throw new AggregateError(
						[error, cleanup_error],
						`Sandbox creation failed; cleanup failed for ${sandbox.id}: ${String(cleanup_error)}`,
					);
				}
				throw error;
			}
		},
	),
	define_operation(
		'sandbox_list',
		'List Daytona sandboxes (default limit 20).',
		v.object({ limit: v.optional(v.number()) }),
		({ limit }) => list_sandboxes(limit),
	),
	define_operation(
		'sandbox_run',
		'Run a command in a fresh sandbox and delete it by default. Returns stdout, stderr, exit_code, timed_out and cleanup_error. Non-zero command exits are data; API failures throw. env entries use KEY=value.',
		v.object({
			...create_fields,
			command: nonempty,
			repo: v.optional(nonempty),
			branch: v.optional(nonempty),
			cwd: v.optional(nonempty),
			keep: v.optional(v.boolean()),
			create_timeout: v.optional(v.number()),
			delete_timeout: v.optional(v.number()),
		}),
		(
			{
				command,
				image,
				name,
				auto_stop,
				timeout,
				snapshot,
				env,
				repo,
				branch,
				cwd,
				keep,
				create_timeout,
				delete_timeout,
			},
			signal,
		) =>
			run_sandbox(
				{
					command,
					image,
					name,
					timeout,
					snapshot,
					repo,
					branch,
					cwd,
					keep,
					create_timeout,
					delete_timeout,
					auto_stop_interval: auto_stop,
					env_vars: env_from_entries(env),
				},
				signal,
			),
	),
	define_operation(
		'sandbox_ssh',
		'Get masked SSH connection details. Use the CLI sandbox ssh --show-secrets to obtain the token.',
		v.object({ id: nonempty, expires: v.optional(v.number()) }),
		async ({ id, expires }) => {
			const access = await get_ssh_access(id, expires);
			return {
				token: '***REDACTED***',
				token_masked: true,
				command: 'ssh ***REDACTED***@ssh.app.daytona.io',
				expires_at: new Date(access.expiresAt).toISOString(),
			};
		},
	),
	define_operation(
		'sandbox_delete',
		'Delete a Daytona sandbox.',
		v.object({ id: nonempty, timeout: v.optional(v.number()) }),
		({ id, timeout }) => delete_sandbox(id, timeout),
	),
	define_operation(
		'sandbox_exec',
		'Execute in an existing sandbox. Returns exit_code and combined output as stdout. The existing first-word command filter applies; it is not a shell security boundary. Commands are audit logged.',
		v.object({
			id: nonempty,
			cmd: nonempty,
			cwd: v.optional(nonempty),
			timeout: v.optional(v.number()),
		}),
		async ({ id, cmd, cwd, timeout }) => {
			const allowed = is_command_allowed(cmd);
			console.error(
				'[AUDIT]',
				JSON.stringify({
					type: 'sandbox_exec_audit',
					timestamp: new Date().toISOString(),
					sandbox_id: id,
					command: cmd,
					allowed,
				}),
			);
			if (!allowed)
				throw new Error(
					`Command not allowed: "${cmd.trim().split(/\s+/)[0]}"`,
				);
			const result = await exec_sandbox(id, cmd, cwd, timeout);
			console.error(
				'[AUDIT]',
				JSON.stringify({
					type: 'sandbox_exec_audit',
					timestamp: new Date().toISOString(),
					sandbox_id: id,
					command: cmd,
					allowed,
					exit_code: result.exit_code,
				}),
			);
			return result;
		},
	),
	define_operation(
		'sandbox_env_list',
		'List the current environment inherited by new sandbox processes. Values may contain secrets.',
		v.object({ id: nonempty }),
		({ id }) => list_sandbox_env(id),
	),
	define_operation(
		'sandbox_env_set',
		'Set a sandbox environment variable for new processes, sessions and PTYs. Existing processes are unchanged.',
		v.object({ id: nonempty, key: nonempty, value: v.string() }),
		({ id, key, value }) => set_sandbox_env(id, key, value),
	),
];

export function create_sandbox_tools(
	get_signal: () => AbortSignal | undefined,
) {
	return sandbox_operations.map((operation) =>
		defineTool<v.GenericSchema<Record<string, unknown>>>(
			{
				name: operation.name,
				description: operation.description,
				schema: operation.schema,
			},
			async (input) => {
				try {
					const result = await operation.execute(input, get_signal());
					const failed =
						!!result &&
						typeof result === 'object' &&
						(('exit_code' in result && result.exit_code !== 0) ||
							('cleanup_error' in result && !!result.cleanup_error));
					return failed
						? tool.error(JSON.stringify(result))
						: tool.text(JSON.stringify(result));
				} catch (error) {
					return tool.error(
						error instanceof Error ? error.message : String(error),
					);
				}
			},
		),
	);
}
