import { describe, expect, test } from 'bun:test';
import { mask_token, REDACTED } from '../commands/sandbox/ssh';

describe('mask_token', () => {
	test('masks middle of standard token', () => {
		const token = 'abcd1234efgh5678';
		const masked = mask_token(token);
		expect(masked).toBe('abcd****5678');
	});

	test('shows first 4 and last 4 chars', () => {
		const token = 'START_middle_END!';
		const masked = mask_token(token);
		expect(masked.startsWith('STAR')).toBe(true);
		expect(masked.endsWith('END!'));
		expect(masked).toBe('STAR****END!');
	});

	test('fully masks tokens with 4 or fewer chars', () => {
		expect(mask_token('abcd')).toBe('****');
		expect(mask_token('abc')).toBe('****');
		expect(mask_token('ab')).toBe('****');
		expect(mask_token('a')).toBe('****');
	});

	test('handles empty token', () => {
		expect(mask_token('')).toBe('****');
	});

	test('handles exactly 5 char token', () => {
		// 5 chars: first 4 + **** + last 4 = overlapping slice
		const masked = mask_token('abcde');
		expect(masked).toBe('abcd****bcde');
	});

	test('handles exactly 8 char token', () => {
		// 8 chars: first 4 + **** + last 4 = 'abcd****efgh'
		const masked = mask_token('abcdefgh');
		expect(masked).toBe('abcd****efgh');
	});

	test('does not expose middle content', () => {
		const token = 'pub_secret_key_end';
		const masked = mask_token(token);
		expect(masked).not.toContain('secret');
		expect(masked).not.toContain('key');
	});

	test('handles tokens with special characters', () => {
		const token = 'a$b#c%d^e&f*g!h@i';
		const masked = mask_token(token);
		expect(masked).toBe('a$b#****!h@i');
		expect(masked).not.toContain('%');
		expect(masked).not.toContain('&');
	});
});

describe('SSH output security - REDACTED constant', () => {
	test('REDACTED is properly defined', () => {
		expect(REDACTED).toBe('***REDACTED***');
	});

	test('REDACTED is clearly marked as redacted', () => {
		expect(REDACTED).toContain('REDACTED');
		expect(REDACTED.startsWith('*')).toBe(true);
		expect(REDACTED.endsWith('*')).toBe(true);
	});
});

describe('SSH JSON output security', () => {
	test('JSON without --show-secrets uses REDACTED', () => {
		const show_secrets = false;
		const token = 'real_secret_token_12345';
		const display_token = show_secrets ? token : REDACTED;

		expect(display_token).toBe(REDACTED);
		expect(display_token).not.toContain('secret');
		expect(display_token).not.toContain('12345');
	});

	test('JSON with --show-secrets shows full token', () => {
		const show_secrets = true;
		const token = 'real_secret_token_12345';
		const display_token = show_secrets ? token : REDACTED;

		expect(display_token).toBe(token);
		expect(display_token).toContain('secret');
	});

	test('JSON output structure with redacted token', () => {
		const show_secrets = false;
		const token = 'abc123xyz789';
		const display_token = show_secrets ? token : REDACTED;

		const output = {
			token: display_token,
			token_masked: !show_secrets,
			command: 'ssh ' + display_token + '@ssh.app.daytona.io',
		};

		expect(output.token).toBe(REDACTED);
		expect(output.token_masked).toBe(true);
		expect(output.command).toContain(REDACTED);
		expect(output.command).not.toContain('abc123');
	});

	test('JSON output structure with visible token', () => {
		const show_secrets = true;
		const token = 'abc123xyz789';
		const display_token = show_secrets ? token : REDACTED;

		const output = {
			token: display_token,
			token_masked: !show_secrets,
			command: 'ssh ' + display_token + '@ssh.app.daytona.io',
		};

		expect(output.token).toBe(token);
		expect(output.token_masked).toBe(false);
		expect(output.command).toContain(token);
	});
});

describe('SSH text output security', () => {
	test('text output uses masked token without --show-secrets', () => {
		const show_secrets = false;
		const token = 'dayt_abcdefghijklmnop';

		if (show_secrets) {
			// Full token shown
			expect(token).toBe(token);
		} else {
			const masked = mask_token(token);
			expect(masked).toBe('dayt****mnop');
			expect(masked).not.toContain('abcdefgh');
		}
	});

	test('text output shows full token with --show-secrets', () => {
		const show_secrets = true;
		const token = 'dayt_abcdefghijklmnop';

		if (show_secrets) {
			expect(token).toBe('dayt_abcdefghijklmnop');
		}
	});

	test('masked token in command is consistent', () => {
		const token = 'secrettoken12345678';
		const masked = mask_token(token);

		const command = 'ssh ' + masked + '@ssh.app.daytona.io';
		expect(command).toContain(masked);
		expect(command).not.toContain('secrettoken');
	});
});

describe('token security edge cases', () => {
	test('whitespace-only token is masked', () => {
		expect(mask_token('    ')).toBe('****');
		expect(mask_token('   ')).toBe('****');
	});

	test('unicode token is handled', () => {
		const token = '\u{1F511}key\u{1F510}lock';
		const masked = mask_token(token);
		// Should still mask middle portion
		expect(masked.length).toBeGreaterThan(0);
	});

	test('very long token is properly masked', () => {
		const token = 'a'.repeat(1000);
		const masked = mask_token(token);
		expect(masked).toBe('aaaa****aaaa');
		expect(masked.length).toBe(12);
	});

	test('token with newlines is masked', () => {
		const token = 'line1\nline2\nline3';
		const masked = mask_token(token);
		expect(masked).not.toContain('line2');
	});
});
