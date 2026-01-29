/**
 * Sandbox Creation
 * Factory function for creating Daytona sandboxes
 */

import { Image } from '@daytonaio/sdk';
import { create_daytona_client } from './client.js';
import { Sandbox } from './sandbox.js';
import type { CreateSandboxOptions } from './types.js';

/** Default base image for sandboxes */
const DEFAULT_BASE_IMAGE = 'node:22-slim';

/** Default dockerfile commands for pre-baked image */
const DEFAULT_DOCKERFILE_COMMANDS = [
	'RUN apt-get update && apt-get install -y git curl && rm -rf /var/lib/apt/lists/*',
	'RUN npm install -g typescript tsx',
];

/** Default timeout for sandbox creation in seconds */
const DEFAULT_TIMEOUT = 120;

/**
 * Create a pre-baked image with default tools
 * @param base - Base image (default: node:22-slim)
 * @param additional_commands - Additional dockerfile commands to include
 * @returns Daytona Image
 */
export function create_default_image(
	base: string = DEFAULT_BASE_IMAGE,
	additional_commands: string[] = [],
): Image {
	const commands = [...DEFAULT_DOCKERFILE_COMMANDS, ...additional_commands];
	return Image.base(base).dockerfileCommands(commands);
}

/**
 * Create a new Daytona sandbox
 * @param options - Sandbox creation options
 * @returns Sandbox instance
 */
export async function create_sandbox(
	options: CreateSandboxOptions = {},
): Promise<Sandbox> {
	const daytona = create_daytona_client();

	// If snapshot provided, use it directly (fast path)
	if (options.snapshot) {
		const sandbox = await daytona.create(
			{
				name: options.name,
				snapshot: options.snapshot,
				language: 'typescript',
				envVars: options.env_vars,
				labels: options.labels,
				autoStopInterval: options.auto_stop_interval,
			},
			{
				timeout: options.timeout ?? DEFAULT_TIMEOUT,
			},
		);
		return new Sandbox(daytona, sandbox);
	}

	// Determine the image to use
	let image: string | Image;

	if (options.image) {
		if (typeof options.image === 'string') {
			// String image - use directly or add commands
			if (options.dockerfile_commands?.length) {
				image = Image.base(options.image).dockerfileCommands(
					options.dockerfile_commands,
				);
			} else {
				image = options.image;
			}
		} else {
			// Already an Image object
			image = options.image;
		}
	} else {
		// Use default pre-baked image
		image = create_default_image(
			DEFAULT_BASE_IMAGE,
			options.dockerfile_commands,
		);
	}

	const sandbox = await daytona.create(
		{
			name: options.name,
			image,
			language: 'typescript',
			envVars: options.env_vars,
			labels: options.labels,
			autoStopInterval: options.auto_stop_interval,
		},
		{
			timeout: options.timeout ?? DEFAULT_TIMEOUT,
			onSnapshotCreateLogs: options.on_build_log,
		},
	);

	return new Sandbox(daytona, sandbox);
}
