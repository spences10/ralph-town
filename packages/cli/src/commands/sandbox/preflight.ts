/**
 * sandbox preflight command
 * Verify snapshot has required tools before spawning teammates
 *
 * Uses SSH instead of sandbox.exec because exec returns -1 for
 * snapshot-based sandboxes (known issue #31)
 */

import { defineCommand } from 'citty';
import { Daytona } from '@daytonaio/sdk';
import { spawn } from 'child_process';
import 'dotenv/config';

// Tools to check with their expected paths
const REQUIRED_TOOLS: Array<{ name: string; path: string }> = [
	{ name: 'gh', path: '/usr/bin/gh' },
	{ name: 'git', path: '/usr/bin/git' },
	{ name: 'bun', path: '/root/.bun/bin/bun' },
	{ name: 'curl', path: '/usr/bin/curl' },
];
const DEFAULT_SNAPSHOT = 'ralph-town-dev';

/** Run command via SSH and return exit code + stdout */
async function ssh_exec(
	token: string,
	command: string,
): Promise<{ exitCode: number; stdout: string }> {
	return new Promise((resolve) => {
		const proc = spawn(
			'ssh',
			[
				'-o',
				'StrictHostKeyChecking=no',
				'-o',
				'BatchMode=yes',
				`${token}@ssh.app.daytona.io`,
				command,
			],
			{ stdio: ['ignore', 'pipe', 'pipe'] },
		);

		let stdout = '';
		proc.stdout.on('data', (data) => (stdout += data.toString()));
		proc.stderr.on('data', (data) => (stdout += data.toString()));

		proc.on('close', (code) => {
			resolve({ exitCode: code ?? 1, stdout });
		});
	});
}

export default defineCommand({
	meta: {
		name: 'preflight',
		description: 'Verify snapshot has required tools (gh, git, bun)',
	},
	args: {
		snapshot: {
			type: 'string',
			description: `Snapshot to test (default: ${DEFAULT_SNAPSHOT})`,
		},
		json: {
			type: 'boolean',
			description: 'Output as JSON',
		},
	},
	async run({ args }) {
		const snapshot_name = args.snapshot ?? DEFAULT_SNAPSHOT;
		const json_output = args.json ?? false;

		if (!json_output) {
			console.log(`Preflight check for snapshot: ${snapshot_name}\n`);
		}

		const daytona = new Daytona();
		let sandbox_id: string | null = null;

		try {
			// 1. Create test sandbox
			if (!json_output) {
				console.log('Creating test sandbox...');
			}

			const sandbox = await daytona.create(
				{ snapshot: snapshot_name, language: 'typescript' },
				{ timeout: 120 },
			);
			sandbox_id = sandbox.id;

			if (!json_output) {
				console.log(`  Sandbox ID: ${sandbox_id}`);
			}

			// 2. Get SSH credentials
			const ssh_access = await sandbox.createSshAccess(5); // 5 min expiry
			const ssh_token = ssh_access.token;

			if (!json_output) {
				console.log('  Checking tools via SSH...');
			}

			// 3. Check each required tool via SSH
			const results: Record<string, boolean> = {};
			let all_passed = true;

			for (const tool of REQUIRED_TOOLS) {
				const result = await ssh_exec(
					ssh_token,
					`/bin/test -x ${tool.path} && echo "OK"`,
				);
				const found = result.stdout.includes('OK');

				results[tool.name] = found;

				if (!found) {
					all_passed = false;
				}

				if (!json_output) {
					const status = found
						? '\x1b[32m✓\x1b[0m'
						: '\x1b[31m✗\x1b[0m';
					const display = found ? tool.path : 'not found';
					console.log(`  ${status} ${tool.name}: ${display}`);
				}
			}

			// 4. Cleanup
			if (!json_output) {
				console.log('\nDeleting test sandbox...');
			}
			await sandbox.delete();
			sandbox_id = null;

			// 5. Report results
			if (json_output) {
				console.log(
					JSON.stringify({
						snapshot: snapshot_name,
						passed: all_passed,
						tools: results,
					}),
				);
			} else {
				console.log('');
				if (all_passed) {
					console.log('\x1b[32m✓ Preflight passed!\x1b[0m');
					console.log('  Snapshot is ready for teammate sandboxes.');
				} else {
					console.log('\x1b[31m✗ Preflight failed!\x1b[0m');
					console.log('  Rebuild snapshot with:');
					console.log(
						'  bun run packages/cli/src/core/create-snapshot.ts --force',
					);
					process.exit(1);
				}
			}
		} catch (error) {
			// Cleanup on error
			if (sandbox_id) {
				try {
					const sandbox = await daytona.get(sandbox_id);
					await sandbox.delete();
				} catch {
					// Ignore cleanup errors
				}
			}

			const message =
				error instanceof Error ? error.message : String(error);

			if (json_output) {
				console.log(
					JSON.stringify({
						snapshot: snapshot_name,
						passed: false,
						error: message,
					}),
				);
			} else {
				console.error(`\n\x1b[31mError: ${message}\x1b[0m`);
			}
			process.exit(1);
		}
	},
});
