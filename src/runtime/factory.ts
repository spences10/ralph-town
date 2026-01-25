/**
 * Runtime Factory
 * Creates appropriate runtime based on config
 */

import { DaytonaRuntime } from './daytona.js';
import { DevContainerRuntime } from './devcontainer.js';
import { LocalRuntime } from './local.js';
import type { RuntimeEnvironment, RuntimeType } from './types.js';

export interface RuntimeConfig {
	type: RuntimeType;
	workspace?: string;
	on_build_log?: (chunk: string) => void;
}

/**
 * Create a runtime environment based on config
 */
export function create_runtime(
	config: RuntimeConfig,
): RuntimeEnvironment {
	switch (config.type) {
		case 'local':
			return new LocalRuntime(config.workspace);

		case 'devcontainer':
			return new DevContainerRuntime(config.workspace);

		case 'daytona':
			return new DaytonaRuntime({
				on_build_log: config.on_build_log,
			});

		default:
			throw new Error(`Unknown runtime type: ${config.type}`);
	}
}

/**
 * Validate environment for runtime
 */
export function validate_runtime_env(type: RuntimeType): string[] {
	const missing: string[] = [];

	// Always need Anthropic key for agent
	if (!process.env.ANTHROPIC_API_KEY) {
		missing.push('ANTHROPIC_API_KEY');
	}

	// Daytona needs its own key
	if (type === 'daytona' && !process.env.DAYTONA_API_KEY) {
		missing.push('DAYTONA_API_KEY');
	}

	return missing;
}
