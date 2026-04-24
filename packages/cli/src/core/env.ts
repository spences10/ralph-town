import * as fs from 'node:fs';

export function parse_env_file(path: string): Record<string, string> {
	const content = fs.readFileSync(path, 'utf-8');
	const env: Record<string, string> = {};
	for (const line of content.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const [key, ...rest] = trimmed.split('=');
		if (key) env[key] = rest.join('=');
	}
	return env;
}

export function parse_env_flags(
	value: string | undefined,
): Record<string, string> {
	if (!value) return {};
	const env: Record<string, string> = {};
	for (const part of value.split(',')) {
		const [key, ...value_parts] = part.trim().split('=');
		if (key && value_parts.length > 0) {
			env[key] = value_parts.join('=');
		}
	}
	return env;
}

/**
 * Normalize local/sandbox credential names before injecting env vars into
 * a remote sandbox.
 *
 * Local orchestration keys stay local:
 * - GH_TOKEN
 * - ANTHROPIC_API_KEY
 *
 * Sandbox-scoped keys are forwarded under the names common tools expect
 * inside the sandbox:
 * - SANDBOX_GH_TOKEN -> GH_TOKEN
 * - SANDBOX_ANTHROPIC_API_KEY -> ANTHROPIC_API_KEY
 *
 * GITHUB_PAT remains a deprecated compatibility alias for SANDBOX_GH_TOKEN.
 */
export function normalize_sandbox_env(
	env: Record<string, string>,
): Record<string, string> {
	const normalized = { ...env };

	if (env.SANDBOX_GH_TOKEN) {
		normalized.GH_TOKEN = env.SANDBOX_GH_TOKEN;
	} else if (env.GITHUB_PAT && !env.GH_TOKEN) {
		normalized.GH_TOKEN = env.GITHUB_PAT;
	}

	if (env.SANDBOX_ANTHROPIC_API_KEY) {
		normalized.ANTHROPIC_API_KEY = env.SANDBOX_ANTHROPIC_API_KEY;
	}

	delete normalized.SANDBOX_GH_TOKEN;
	delete normalized.GITHUB_PAT;
	delete normalized.SANDBOX_ANTHROPIC_API_KEY;

	return normalized;
}
