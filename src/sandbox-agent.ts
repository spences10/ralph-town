/**
 * Developer Agent - runs inside Daytona sandbox
 *
 * This file is uploaded to the sandbox and executed there.
 * It uses the Claude Agent SDK to perform coding tasks.
 */

import { query } from '@anthropic-ai/claude-agent-sdk';

const WORKSPACE = '/home/daytona/workspace';

const system_prompt = `You are a Developer Agent running in a Daytona sandbox.

## Working Directory
Your workspace is: ${WORKSPACE}
Always work within this directory.

## Your Task
You will receive a specific task to complete. Focus on that task only.
Each execution is a fresh session - you have no memory of previous attempts.

## Important Rules
- DO NOT implement placeholder or stub code - full implementations only
- Complete the task thoroughly before finishing
- If the task involves code, make sure it compiles/builds

## Tools Available
- Read, Write, Edit files
- Bash commands (npm, pnpm, git, curl, etc.)
- Glob and Grep for searching

Complete the task fully and report what you did.`;

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
