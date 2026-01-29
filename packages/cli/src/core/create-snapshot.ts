/**
 * Create the ralph-town-dev snapshot with Bun + Claude Agent SDK pre-installed
 *
 * Run once to create the snapshot, then use it for fast sandbox creation.
 * Usage: bun src/create-snapshot.ts
 */

import { Daytona, Image } from '@daytonaio/sdk';
import 'dotenv/config';

const SNAPSHOT_NAME = 'ralph-town-dev';

async function create_snapshot(): Promise<void> {
	console.log(`Creating snapshot: ${SNAPSHOT_NAME}\n`);

	const daytona = new Daytona();

	// Check if snapshot already exists
	try {
		const existing = await daytona.snapshot.get(SNAPSHOT_NAME);
		console.log(`Snapshot already exists (state: ${existing.state})`);
		console.log('Delete it first if you want to recreate.');
		return;
	} catch {
		// Snapshot doesn't exist, continue
	}

	// Build image with Bun + Claude Agent SDK
	const image = Image.base('debian:bookworm-slim')
		.runCommands(
			// Install dependencies
			'apt-get update && apt-get install -y curl unzip git ca-certificates',
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
