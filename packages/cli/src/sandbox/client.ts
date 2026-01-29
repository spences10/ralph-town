/**
 * Daytona Client Factory
 * Creates Daytona client with proper error handling for missing credentials
 */

import { Daytona } from '@daytonaio/sdk';

/** Environment variable name for API key */
const API_KEY_ENV_VAR = 'DAYTONA_API_KEY';

/**
 * Error thrown when DAYTONA_API_KEY is missing
 */
export class MissingApiKeyError extends Error {
	readonly code = 'MISSING_API_KEY';

	constructor() {
		super(
			`Missing ${API_KEY_ENV_VAR} environment variable.\n\n` +
				`To fix this:\n` +
				`  1. Get your API key from https://app.daytona.io/dashboard/keys\n` +
				`  2. Set the environment variable:\n` +
				`     export ${API_KEY_ENV_VAR}=your-api-key\n\n` +
				`Or add it to your .env file:\n` +
				`     ${API_KEY_ENV_VAR}=your-api-key`,
		);
		this.name = 'MissingApiKeyError';
	}
}

/**
 * Create a Daytona client with validated credentials
 * @throws MissingApiKeyError if DAYTONA_API_KEY is not set
 * @returns Daytona client instance
 */
export function create_daytona_client(): Daytona {
	const api_key = process.env[API_KEY_ENV_VAR];

	if (!api_key) {
		throw new MissingApiKeyError();
	}

	return new Daytona();
}

/**
 * Check if an error is a MissingApiKeyError
 */
export function is_missing_api_key_error(
	error: unknown,
): error is MissingApiKeyError {
	return (
		error instanceof Error &&
		(error as MissingApiKeyError).code === 'MISSING_API_KEY'
	);
}
