import { describe, expect, it } from 'vitest';
import { normalize_sandbox_env, parse_env_flags } from './env.js';

describe('parse_env_flags', () => {
	it('parses comma-separated KEY=VALUE pairs', () => {
		expect(parse_env_flags('FOO=bar,BAZ=qux=1')).toEqual({
			FOO: 'bar',
			BAZ: 'qux=1',
		});
	});
});

describe('normalize_sandbox_env', () => {
	it('maps sandbox GitHub token to in-sandbox GH_TOKEN', () => {
		expect(
			normalize_sandbox_env({ SANDBOX_GH_TOKEN: 'sandbox' }),
		).toEqual({ GH_TOKEN: 'sandbox' });
	});

	it('keeps GITHUB_PAT as a deprecated fallback alias', () => {
		expect(normalize_sandbox_env({ GITHUB_PAT: 'pat' })).toEqual({
			GH_TOKEN: 'pat',
		});
	});

	it('prefers sandbox GitHub token over local GH_TOKEN', () => {
		expect(
			normalize_sandbox_env({
				GH_TOKEN: 'local',
				SANDBOX_GH_TOKEN: 'sandbox',
			}),
		).toEqual({ GH_TOKEN: 'sandbox' });
	});

	it('maps sandbox Anthropic key to in-sandbox ANTHROPIC_API_KEY', () => {
		expect(
			normalize_sandbox_env({
				ANTHROPIC_API_KEY: 'local',
				SANDBOX_ANTHROPIC_API_KEY: 'sandbox',
			}),
		).toEqual({ ANTHROPIC_API_KEY: 'sandbox' });
	});

	it('keeps non-credential env vars untouched', () => {
		expect(normalize_sandbox_env({ NODE_ENV: 'test' })).toEqual({
			NODE_ENV: 'test',
		});
	});
});
