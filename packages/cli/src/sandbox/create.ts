import { DaytonaTimeoutError, Image } from '@daytona/sdk';
import { create_daytona_client } from './client.js';
import { Sandbox } from './sandbox.js';
import type { CreateSandboxOptions } from './types.js';
import { validate_sandbox_name } from './validation.js';

const DEFAULT_BASE_IMAGE = 'node:22-bookworm-slim';
const DEFAULT_DOCKERFILE_COMMANDS = [
	'RUN apt-get update && apt-get install -y git curl && rm -rf /var/lib/apt/lists/*',
	'RUN corepack enable && corepack prepare pnpm@latest --activate',
	'RUN npm install -g typescript tsx',
];

export function create_default_image(
	base: string = DEFAULT_BASE_IMAGE,
	additional_commands: string[] = [],
): Image {
	return Image.base(base).dockerfileCommands([
		...DEFAULT_DOCKERFILE_COMMANDS,
		...additional_commands,
	]);
}

/** Create once: an uncertain response must not create a second sandbox. */
export async function create_sandbox(
	options: CreateSandboxOptions = {},
): Promise<Sandbox> {
	if (options.name) validate_sandbox_name(options.name);
	const daytona = create_daytona_client();
	const params = {
		name: options.name,
		language: 'typescript' as const,
		envVars: options.env_vars,
		labels: options.labels,
		autoStopInterval: options.auto_stop_interval,
		ephemeral: options.ephemeral,
	};
	let image = options.image;
	if (!options.snapshot) {
		if (!image) {
			image = create_default_image(
				undefined,
				options.dockerfile_commands,
			);
		} else if (
			typeof image === 'string' &&
			options.dockerfile_commands?.length
		) {
			image = Image.base(image).dockerfileCommands(
				options.dockerfile_commands,
			);
		}
	}
	try {
		const create_options = {
			timeout: options.timeout ?? 120,
			onSnapshotCreateLogs: options.on_build_log,
		};
		const raw_sandbox = options.snapshot
			? await daytona.create(
					{ ...params, snapshot: options.snapshot },
					create_options,
				)
			: await daytona.create(
					{ ...params, image: image! },
					create_options,
				);
		return new Sandbox(raw_sandbox);
	} catch (error) {
		// The SDK reports an ID when creation timed out after allocating a sandbox.
		if (error instanceof DaytonaTimeoutError && error.sandboxId) {
			try {
				const partial = await daytona.get(error.sandboxId);
				await partial.delete(30);
			} catch (cleanup_error) {
				throw new AggregateError(
					[error, cleanup_error],
					`Sandbox creation failed; cleanup failed for ${error.sandboxId}: ${String(cleanup_error)}`,
				);
			}
		}
		throw error;
	}
}
