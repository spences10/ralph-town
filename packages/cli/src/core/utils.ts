// ANSI escape codes for terminal formatting
export const ESC = '\x1b[';
export const BOLD = `${ESC}1m`;
export const ITALIC = `${ESC}3m`;
export const DIM = `${ESC}2m`;
export const RESET = `${ESC}0m`;
export const GREEN = `${ESC}32m`;
export const CYAN = `${ESC}36m`;
export const YELLOW = `${ESC}33m`;
export const RED = `${ESC}31m`;

/**
 * Render markdown-like syntax to terminal formatting
 */
export function render_markdown(text: string, color?: string): string {
	const color_code = color ?? RESET;

	// Bold: **text**
	let result = text.replace(
		/\*\*(.+?)\*\*/g,
		`${BOLD}$1${RESET}${color_code}`,
	);

	// Italic: *text* (but not if it's part of **)
	result = result.replace(
		/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g,
		`${ITALIC}$1${RESET}${color_code}`,
	);

	// Code: `text`
	result = result.replace(/`(.+?)`/g, `${DIM}$1${RESET}${color_code}`);

	return result;
}

/**
 * Print formatted output with role prefix
 */
export function print_message(
	role: 'pm' | 'dev' | 'system',
	message: string,
): void {
	const prefix = {
		pm: `${GREEN}[Project Manager]${RESET}`,
		dev: `${CYAN}[Developer Agent]${RESET}`,
		system: `${YELLOW}[System]${RESET}`,
	};

	console.log(`${prefix[role]} ${render_markdown(message)}`);
}

/**
 * Print error message
 */
export function print_error(message: string): void {
	console.error(`${RED}[Error]${RESET} ${message}`);
}

/**
 * Extract developer tasks from PM response
 */
export function extract_developer_tasks(text: string): string[] {
	const task_regex = /<developer_task>([\s\S]*?)<\/developer_task>/g;
	const tasks: string[] = [];
	let match;

	while ((match = task_regex.exec(text)) !== null) {
		tasks.push(match[1].trim());
	}

	return tasks;
}

/**
 * Check if PM response indicates task completion
 */
export function is_task_complete(text: string): boolean {
	return text.includes('TASK_COMPLETE');
}

/**
 * Parse and validate numeric CLI flag
 * @param value - String value from CLI arg
 * @param flag_name - Flag name for error message
 * @param default_value - Default if value is undefined
 * @returns Parsed integer
 * @throws Error if value is not a valid integer
 */
export function parse_int_flag(
	value: string | undefined,
	flag_name: string,
	default_value: number,
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
