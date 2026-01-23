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
 * Agent result with usage stats
 */
export interface AgentResult {
	output: string;
	usage: {
		input_tokens: number;
		output_tokens: number;
		total_cost_usd: number;
	};
}

// Model mapping for the SDK
// Using aliases - they auto-update to latest snapshots
const MODEL_MAP: Record<string, string> = {
	haiku: 'claude-haiku-4-5',
	sonnet: 'claude-sonnet-4-5',
	opus: 'claude-opus-4-5',
};

/**
 * Run a developer task and stream output
 */
export async function run_task(
	prompt: string,
	model: string = 'haiku',
): Promise<AgentResult> {
	const results: string[] = [];
	let usage = {
		input_tokens: 0,
		output_tokens: 0,
		total_cost_usd: 0,
	};

	const model_id = MODEL_MAP[model] || MODEL_MAP.haiku;

	try {
		for await (const message of query({
			prompt,
			options: {
				systemPrompt: system_prompt,
				model: model_id,
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
					// Capture usage stats
					usage = {
						input_tokens: message.usage?.input_tokens ?? 0,
						output_tokens: message.usage?.output_tokens ?? 0,
						total_cost_usd: message.total_cost_usd ?? 0,
					};
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
		return { output: `Error: ${error_msg}`, usage };
	}

	return { output: results.join('\n'), usage };
}

// If run directly, execute the task from command line args or stdin
if (import.meta.url === `file://${process.argv[1]}`) {
	const task = process.argv[2];
	const model = process.argv[3] || 'haiku';

	if (!task) {
		console.error('Usage: sandbox-agent.ts <task> [model]');
		process.exit(1);
	}

	run_task(task, model)
		.then((result) => {
			console.log('\n--- Task Complete ---');
			console.log(result.output);
			// Output usage as parseable JSON on a separate line
			console.log(
				`\n__USAGE_JSON__${JSON.stringify(result.usage)}__USAGE_JSON__`,
			);
		})
		.catch((error) => {
			console.error('Fatal error:', error);
			process.exit(1);
		});
}
