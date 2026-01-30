/**
 * sandbox snapshot create command
 * Create the ralph-town-dev snapshot with Bun + Claude Agent SDK pre-installed
 */

import { defineCommand } from 'citty';
import { Daytona, Image } from '@daytonaio/sdk';

const DEFAULT_SNAPSHOT_NAME = 'ralph-town-dev';

export default defineCommand({
	meta: {
		name: 'create',
		description: 'Create a snapshot with Bun + Claude Agent SDK pre-installed',
	},
	args: {
		name: {
			type: 'string',
			description: `Snapshot name (default: ${DEFAULT_SNAPSHOT_NAME})`,
		},
		force: {
			type: 'boolean',
			description: 'Delete existing snapshot and recreate',
		},
		json: {
			type: 'boolean',
			description: 'Output as JSON',
		},
	},
	async run({ args }) {
		const snapshot_name = args.name || DEFAULT_SNAPSHOT_NAME;

		if (!args.json) {
			console.log(`Creating snapshot: ${snapshot_name}\n`);
		}

		const daytona = new Daytona();

		// Check if snapshot already exists
		try {
			const existing = await daytona.snapshot.get(snapshot_name);
			if (args.force) {
				if (!args.json) {
					console.log(
						`Snapshot exists (state: ${existing.state}), deleting...`,
					);
				}
				await daytona.snapshot.delete(existing);
				// Wait for deletion to propagate
				if (!args.json) {
					console.log('Waiting for deletion to complete...');
				}
				await new Promise((resolve) => setTimeout(resolve, 5000));
				if (!args.json) {
					console.log('Deleted existing snapshot.\n');
				}
			} else {
				if (args.json) {
					console.log(
						JSON.stringify({
							exists: true,
							name: existing.name,
							state: existing.state,
						}),
					);
				} else {
					console.log(`Snapshot already exists (state: ${existing.state})`);
					console.log('Use --force to delete and recreate.');
				}
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
				// Fix PATH for SSH sessions
				'echo "PATH=/usr/local/bin:/usr/bin:/bin:/root/.bun/bin" > /etc/environment',
				'echo "export PATH=/usr/local/bin:/usr/bin:/bin:/root/.bun/bin:\\$PATH" > /etc/profile.d/path.sh',
				'echo "export PATH=/usr/local/bin:/usr/bin:/bin:/root/.bun/bin:\\$PATH" >> /root/.bashrc',
			)
			.env({ PATH: '/root/.bun/bin:$PATH' })
			.workdir('/home/daytona')
			.runCommands(
				// Initialize project and install Agent SDK
				'/root/.bun/bin/bun init -y',
				'/root/.bun/bin/bun add @anthropic-ai/claude-agent-sdk',
			);

		if (!args.json) {
			console.log('Building snapshot (this takes ~2-3 minutes)...\n');
		}

		try {
			const snapshot = await daytona.snapshot.create(
				{ name: snapshot_name, image },
				{
					onLogs: args.json ? undefined : (chunk) => process.stdout.write(chunk),
					timeout: 300,
				},
			);

			if (args.json) {
				console.log(
					JSON.stringify({
						name: snapshot.name,
						id: snapshot.id,
						state: snapshot.state,
					}),
				);
			} else {
				console.log(`\nSnapshot created successfully!`);
				console.log(`  Name: ${snapshot.name}`);
				console.log(`  ID: ${snapshot.id}`);
				console.log(`  State: ${snapshot.state}`);
			}
		} catch (error) {
			if (args.json) {
				console.error(
					JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
				);
			} else {
				console.error('\nFailed to create snapshot:', error);
			}
			process.exitCode = 1;
			return;
		}
	},
});
