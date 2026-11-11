import { DaytonaProcessExecutionTimeoutError } from '@daytona/sdk';
import { dirname } from 'node:path';
import { shell_escape } from '../core/utils.js';
import { create_sandbox } from './create.js';
import type { Sandbox } from './sandbox.js';
import type { CreateSandboxOptions } from './types.js';

interface ExecResult {
	exit_code: number;
	stdout: string;
	stderr: string;
	timed_out: boolean;
}

interface CleanupResult {
	deleted: boolean;
	error?: string;
}

export function build_remote_command(options: {
	command: string;
	repo?: string;
	branch?: string;
	cwd?: string;
}): { command: string; cwd?: string } {
	const commands: string[] = [];
	let run_cwd = options.cwd;

	if (options.repo) {
		run_cwd = run_cwd ?? '/home/daytona/project';
		commands.push(`mkdir -p ${shell_escape(dirname(run_cwd))}`);
		commands.push(`rm -rf ${shell_escape(run_cwd)}`);
		const branch_args = options.branch
			? ` --branch ${shell_escape(options.branch)}`
			: '';
		commands.push(
			`git clone --depth 1${branch_args} ${shell_escape(options.repo)} ${shell_escape(run_cwd)}`,
		);
	}

	if (run_cwd) {
		commands.push(`cd ${shell_escape(run_cwd)}`);
	}

	commands.push(options.command);

	return {
		command: commands.join(' && '),
		cwd: run_cwd,
	};
}

export function parse_exec_wrapper_output(options: {
	output: string;
	marker: string;
	timeout_sec: number;
}): ExecResult {
	const exit_match = options.output.match(
		new RegExp(`${options.marker}EXIT:(\\d+)`),
	);
	const stdout_match = options.output.match(
		new RegExp(`${options.marker}STDOUT:([^\\n]*)`),
	);
	const stderr_match = options.output.match(
		new RegExp(`${options.marker}STDERR:([^\\n]*)`),
	);

	if (!exit_match || !stdout_match || !stderr_match) {
		return {
			exit_code: 1,
			stdout: '',
			stderr: `Could not parse Daytona execution output:\n${options.output}`,
			timed_out: false,
		};
	}

	const exit_code = Number.parseInt(exit_match[1] ?? '1', 10);
	const stdout = Buffer.from(
		stdout_match[1] ?? '',
		'base64',
	).toString('utf-8');
	const stderr = Buffer.from(
		stderr_match[1] ?? '',
		'base64',
	).toString('utf-8');
	const timed_out = exit_code === 124;

	return {
		exit_code,
		stdout,
		stderr: timed_out
			? `Command timed out after ${options.timeout_sec}s\n${stderr}`
			: stderr,
		timed_out,
	};
}

export function build_exec_wrapper(options: {
	command: string;
	timeout_sec: number;
	marker: string;
}): string {
	const command_b64 = Buffer.from(options.command, 'utf-8').toString(
		'base64',
	);
	const timeout_arg = `${options.timeout_sec}s`;

	return [
		`command_b64=${shell_escape(command_b64)}`,
		'tmp_dir=$(mktemp -d)',
		'cleanup() { rm -rf "$tmp_dir"; }',
		'trap cleanup EXIT',
		'printf %s "$command_b64" | base64 -d > "$tmp_dir/command.sh"',
		'chmod +x "$tmp_dir/command.sh"',
		'set +e',
		`if command -v timeout >/dev/null 2>&1; then timeout ${shell_escape(timeout_arg)} /bin/sh "$tmp_dir/command.sh" > "$tmp_dir/stdout" 2> "$tmp_dir/stderr"; else /bin/sh "$tmp_dir/command.sh" > "$tmp_dir/stdout" 2> "$tmp_dir/stderr"; fi`,
		'exit_code=$?',
		`printf ${shell_escape(`${options.marker}EXIT:%s\\n`)} "$exit_code"`,
		`printf ${shell_escape(`${options.marker}STDOUT:`)}`,
		'base64 "$tmp_dir/stdout" | tr -d "\\n"',
		'printf "\\n"',
		`printf ${shell_escape(`${options.marker}STDERR:`)}`,
		'base64 "$tmp_dir/stderr" | tr -d "\\n"',
		'printf "\\n"',
		`printf ${shell_escape(`${options.marker}END\\n`)}`,
		'exit 0',
	].join('; ');
}

async function sandbox_exec(options: {
	sandbox: Sandbox;
	command: string;
	timeout_sec: number;
	signal?: AbortSignal;
}): Promise<ExecResult> {
	const marker = `__RALPH_TOWN_${Date.now()}_${Math.random().toString(36).slice(2)}__`;
	const wrapper = build_exec_wrapper({
		command: options.command,
		timeout_sec: options.timeout_sec,
		marker,
	});

	try {
		const result = await wait_for_execution(
			options.sandbox.raw.process.executeCommand(
				wrapper,
				undefined,
				undefined,
				options.timeout_sec + 30,
			),
			options.signal,
		);

		return parse_exec_wrapper_output({
			output: result.result,
			marker,
			timeout_sec: options.timeout_sec,
		});
	} catch (error) {
		options.signal?.throwIfAborted();
		const timed_out =
			error instanceof DaytonaProcessExecutionTimeoutError;
		return {
			exit_code: timed_out ? 124 : 1,
			stdout: '',
			stderr: error instanceof Error ? error.message : String(error),
			timed_out,
		};
	}
}

async function cleanup_sandbox(
	sandbox: Sandbox,
	timeout: number,
): Promise<CleanupResult> {
	try {
		await sandbox.delete(timeout);
		return { deleted: true };
	} catch (error) {
		return {
			deleted: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/** Stop waiting on execution when cancelled so host-side cleanup can run. */
function wait_for_execution<T>(
	pending: Promise<T>,
	signal?: AbortSignal,
): Promise<T> {
	if (!signal) return pending;
	return new Promise((resolve, reject) => {
		const on_abort = () => reject(signal.reason);
		signal.addEventListener('abort', on_abort, { once: true });
		pending.then(
			(value) => {
				signal.removeEventListener('abort', on_abort);
				resolve(value);
			},
			(error) => {
				signal.removeEventListener('abort', on_abort);
				reject(error);
			},
		);
		if (signal.aborted) on_abort();
	});
}

export interface RunOptions extends Omit<
	CreateSandboxOptions,
	'timeout' | 'ephemeral'
> {
	command: string;
	repo?: string;
	branch?: string;
	cwd?: string;
	timeout?: number;
	create_timeout?: number;
	delete_timeout?: number;
	keep?: boolean;
}

/** Cleanup belongs to the host, not to the generated Code Mode script. */
export async function run_sandbox(
	options: RunOptions,
	signal?: AbortSignal,
) {
	signal?.throwIfAborted();
	const started_at = Date.now();
	const remote = build_remote_command(options);
	const sandbox = await create_sandbox({
		...options,
		timeout: options.create_timeout,
		ephemeral: !options.keep,
	});
	let cleanup: CleanupResult = { deleted: false };
	let result: ExecResult | undefined;
	let run_error: unknown;
	try {
		// Creation cannot be interrupted by AbortSignal. Clean up once it returns.
		signal?.throwIfAborted();
		result = await sandbox_exec({
			sandbox,
			command: remote.command,
			timeout_sec: options.timeout ?? 120,
			signal,
		});
	} catch (error) {
		run_error = error;
	} finally {
		if (!options.keep) {
			cleanup = await cleanup_sandbox(
				sandbox,
				options.delete_timeout ?? 60,
			);
		}
	}
	if (!result) {
		if (cleanup.error) {
			throw new AggregateError(
				[run_error],
				`Run failed; cleanup failed for ${sandbox.id}: ${cleanup.error}`,
			);
		}
		throw run_error;
	}
	return {
		sandbox_id: sandbox.id,
		command: options.command,
		repo: options.repo ?? null,
		branch: options.branch ?? null,
		cwd: remote.cwd ?? null,
		...result,
		duration_ms: Date.now() - started_at,
		kept: !!options.keep,
		deleted: cleanup.deleted,
		cleanup_error: cleanup.error ?? null,
	};
}
