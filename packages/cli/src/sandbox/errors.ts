/**
 * CLI Error Types
 * Consistent error handling for SDK failures
 */

/** Standard CLI error output format */
export interface CliError {
	error: true;
	code: string;
	message: string;
}

/** Base class for CLI errors with consistent JSON output */
export abstract class BaseCliError extends Error {
	abstract readonly code: string;

	/** Convert to CLI error format for JSON output */
	toCliError(): CliError {
		return {
			error: true,
			code: this.code,
			message: this.message,
		};
	}
}

/** Error thrown when sandbox is not found */
export class SandboxNotFoundError extends BaseCliError {
	readonly code = 'SANDBOX_NOT_FOUND';

	constructor(id: string) {
		super(`Sandbox not found: ${id}`);
		this.name = 'SandboxNotFoundError';
	}
}

/** Wrapper for Daytona SDK errors */
export class SdkError extends BaseCliError {
	readonly code = 'SDK_ERROR';
	readonly originalError: unknown;

	constructor(message: string, originalError?: unknown) {
		super(message);
		this.name = 'SdkError';
		this.originalError = originalError;
	}

	static from(error: unknown): SdkError {
		if (error instanceof Error) {
			return new SdkError(error.message, error);
		}
		return new SdkError(String(error), error);
	}
}

/** Output error as JSON to stderr and set exit code */
export function output_error(
	error: BaseCliError | CliError,
	json_mode: boolean,
): void {
	const cli_error =
		'toCliError' in error ? error.toCliError() : error;

	if (json_mode) {
		console.error(JSON.stringify(cli_error));
	} else {
		console.error('Error: ' + cli_error.message);
	}
	process.exitCode = 1;
}

/** Check if error is a sandbox not found error from SDK */
export function is_sandbox_not_found(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	const msg = error.message.toLowerCase();
	return (
		msg.includes('not found') ||
		msg.includes('does not exist') ||
		msg.includes('404')
	);
}

/** Wrap SDK call with consistent error handling */
export async function wrap_sdk_call<T>(
	fn: () => Promise<T>,
	sandbox_id?: string,
): Promise<T> {
	try {
		return await fn();
	} catch (error) {
		if (sandbox_id && is_sandbox_not_found(error)) {
			throw new SandboxNotFoundError(sandbox_id);
		}
		throw SdkError.from(error);
	}
}
