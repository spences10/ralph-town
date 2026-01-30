/**
 * Create the ralph-town-dev snapshot with Bun + Claude Agent SDK pre-installed
 *
 * Run once to create the snapshot, then use it for fast sandbox creation.
 * Usage: bun src/create-snapshot.ts [--force]
 */

import { Daytona, Image } from '@daytonaio/sdk';
import 'dotenv/config';

const SNAPSHOT_NAME = 'ralph-town-dev';

async function create_snapshot(): Promise<void> {
	const force = process.argv.includes('--force');
	console.log(`Creating snapshot: ${SNAPSHOT_NAME}\n`);

	const daytona = new Daytona();

	// Check if snapshot already exists
	try {
		const existing = await daytona.snapshot.get(SNAPSHOT_NAME);
		if (force) {
			console.log(
				`Snapshot exists (state: ${existing.state}), deleting...`,
			);
			await daytona.snapshot.delete(existing);
			// Wait for deletion to propagate
			console.log('Waiting for deletion to complete...');
			await new Promise((resolve) => setTimeout(resolve, 5000));
			console.log('Deleted existing snapshot.\n');
		} else {
			console.log(`Snapshot already exists (state: ${existing.state})`);
			console.log('Use --force to delete and recreate.');
			return;
		}
	} catch {
		// Snapshot doesn't exist, continue
	}

	// Build image with Bun + Claude Agent SDK + gh CLI
	const image = Image.base('debian:bookworm-slim')
		.runCommands(
			// Install dependencies
			'apt-get update && apt-get install -y curl unzip git ca-certificates',
			// Install gh CLI for PR workflow
			'curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg',
			'chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg',
			'echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null',
			'apt-get update && apt-get install -y gh',
			// Install Bun
			'curl -fsSL https://bun.sh/install | bash',
			// Create working directory
			'mkdir -p /home/daytona',
			// Fix PATH for SSH sessions - multiple approaches for reliability:
			// 1. /etc/environment - read by PAM for all sessions
			'echo "PATH=/usr/local/bin:/usr/bin:/bin:/root/.bun/bin" > /etc/environment',
			// 2. /etc/profile.d/ - for login shells
			'echo "export PATH=/usr/local/bin:/usr/bin:/bin:/root/.bun/bin:\\$PATH" > /etc/profile.d/path.sh',
			// 3. .bashrc - for interactive shells
			'echo "export PATH=/usr/local/bin:/usr/bin:/bin:/root/.bun/bin:\\$PATH" >> /root/.bashrc',
		)
		.env({ PATH: '/root/.bun/bin:$PATH' })
		.workdir('/home/daytona')
		.runCommands(
			// Initialize project and install Agent SDK
			'/root/.bun/bin/bun init -y',
			'/root/.bun/bin/bun add @anthropic-ai/claude-agent-sdk',
		);

	console.log('Building snapshot (this takes ~2-3 minutes)...\n');

	try {
		const snapshot = await daytona.snapshot.create(
			{ name: SNAPSHOT_NAME, image },
			{
				onLogs: (chunk) => process.stdout.write(chunk),
				timeout: 300,
			},
		);

		console.log(`\nSnapshot created successfully!`);
		console.log(`  Name: ${snapshot.name}`);
		console.log(`  ID: ${snapshot.id}`);
		console.log(`  State: ${snapshot.state}`);
	} catch (error) {
		console.error('\nFailed to create snapshot:', error);
		process.exit(1);
	}
}

create_snapshot();
