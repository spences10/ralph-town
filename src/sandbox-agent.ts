/**
 * Developer Agent - runs inside Daytona sandbox
 *
 * This file is uploaded to the sandbox and executed there.
 * It uses the Claude Agent SDK to perform coding tasks.
 */

import { query } from '@anthropic-ai/claude-agent-sdk';

const PREVIEW_URL = process.env.PREVIEW_URL ?? '';

const system_prompt = `You are a Developer Agent running in a Daytona sandbox.

IMPORTANT PATHS:
- Use /home/daytona as your working directory for all file operations
- Do NOT use /workspace

PREVIEW URLS:
- Your public preview URL for port 80 is: ${PREVIEW_URL}
- Other services follow the same pattern on different ports

You have full access to:
- Read, write, and edit files
- Run bash commands
- Search the codebase with Glob and Grep

When you start a dev server, report the preview URL to the user.
Complete tasks thoroughly and report results clearly.`;

/**
 * Run a developer task and stream output
 */
export async function run_task(prompt: string): Promise<string> {
	const results: string[] = [];

	try {
		for await (const message of query({
			prompt,
			options: {
				systemPrompt: system_prompt,
				allowedTools: [
					'Read',
					'Write',
					'Edit',
					'Glob',
					'Grep',
					'Bash',
				],
				permissionMode: 'acceptEdits',
			},
		})) {
			// Handle different message types
			if (message.type === 'assistant') {
				// Extract text content from assistant messages
				for (const block of message.message.content) {
					if (block.type === 'text') {
						process.stdout.write(block.text);
						results.push(block.text);
					} else if (block.type === 'tool_use') {
						process.stdout.write(`\n🔨 ${block.name}\n`);
					}
				}
			} else if (message.type === 'result') {
				if (message.subtype === 'success') {
					results.push(message.result);
				} else {
					// Handle errors
					const errors = 'errors' in message ? message.errors : [];
					results.push(`Error: ${errors.join(', ')}`);
				}
			}
		}
	} catch (error) {
		const error_msg =
			error instanceof Error ? error.message : String(error);
		process.stderr.write(`Agent error: ${error_msg}\n`);
		return `Error: ${error_msg}`;
	}

	return results.join('\n');
}

// If run directly, execute the task from command line args or stdin
if (import.meta.url === `file://${process.argv[1]}`) {
	const task = process.argv[2];
	if (!task) {
		console.error('Usage: sandbox-agent.ts <task>');
		process.exit(1);
	}

	run_task(task)
		.then((result) => {
			console.log('\n--- Task Complete ---');
			console.log(result);
		})
		.catch((error) => {
			console.error('Fatal error:', error);
			process.exit(1);
		});
}
