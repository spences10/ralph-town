/**
 * Sandbox Name Validation
 * Validates sandbox names to prevent issues with special characters
 */

/** Minimum length for sandbox names */
const MIN_NAME_LENGTH = 1;

/** Maximum length for sandbox names (DNS label limit) */
const MAX_NAME_LENGTH = 63;

/** Pattern for valid sandbox names: alphanumeric and hyphens, no leading/trailing hyphens */
const VALID_NAME_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;

/**
 * Validation error for sandbox names
 */
export class SandboxNameValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SandboxNameValidationError';
	}
}

/**
 * Validate a sandbox name
 * @param name - The name to validate
 * @throws SandboxNameValidationError if invalid
 */
export function validate_sandbox_name(name: string): void {
	if (!name || name.length < MIN_NAME_LENGTH) {
		throw new SandboxNameValidationError(
			`Sandbox name must be at least ${MIN_NAME_LENGTH} character(s)`,
		);
	}

	if (name.length > MAX_NAME_LENGTH) {
		throw new SandboxNameValidationError(
			`Sandbox name must be at most ${MAX_NAME_LENGTH} characters (got ${name.length})`,
		);
	}

	if (!VALID_NAME_PATTERN.test(name)) {
		throw new SandboxNameValidationError(
			'Sandbox name must contain only alphanumeric characters and hyphens, ' +
				'and cannot start or end with a hyphen',
		);
	}
}
