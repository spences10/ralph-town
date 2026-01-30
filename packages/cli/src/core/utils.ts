// ANSI escape codes for terminal formatting
export const RESET = '\x1b[0m';
export const GREEN = '\x1b[32m';

/**
 * Parse and validate numeric CLI flag
 * @param value - String value from CLI arg
 * @param flag_name - Flag name for error message
 * @param default_value - Default if value is undefined
 * @param min - Optional minimum value
 * @param max - Optional maximum value
 * @returns Parsed integer
 * @throws Error if value is not a valid integer or outside range
 */
export function parse_int_flag(
	value: string | undefined,
	flag_name: string,
	default_value: number,
	min?: number,
	max?: number,
): number {
	if (value === undefined) {
		return default_value;
	}
	const parsed = parseInt(value, 10);
	if (Number.isNaN(parsed)) {
		throw new Error(
			`Invalid value for --${flag_name}: "${value}" is not a number`,
		);
	}
	if (min !== undefined && parsed < min) {
		throw new Error(`--${flag_name} must be >= ${min}`);
	}
	if (max !== undefined && parsed > max) {
		throw new Error(`--${flag_name} must be <= ${max}`);
	}
	return parsed;
}

/**
 * Parse numeric CLI flag with error handling and exit
 * Consolidates repeated try/catch pattern from commands
 */
export function parse_int_flag_or_exit(
	value: string | undefined,
	flag_name: string,
	default_value: number,
	json_output?: boolean,
): number {
	try {
		return parse_int_flag(value, flag_name, default_value);
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		if (json_output) {
			console.error(JSON.stringify({ error: msg }));
		} else {
			console.error('Error: ' + msg);
		}
		process.exit(1);
	}
}

/**
 * Escape a string for safe use in shell commands
 * Uses single quotes and escapes any embedded single quotes
 */
export function shell_escape(str: string): string {
	return `'${str.replace(/'/g, "'\\''")}'`;
}

/**
 * Validate git branch name (reject unsafe characters)
 * Allows alphanumeric, hyphens, underscores, slashes, dots
 */
export function validate_branch_name(branch: string): boolean {
	return /^[a-zA-Z0-9_.\-/]+$/.test(branch) && !branch.includes('..');
}
