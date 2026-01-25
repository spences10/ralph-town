/**
 * Two-Agent System with Daytona
 *
 * Architecture:
 * - Project Manager Agent (local): Plans and coordinates tasks via Agent SDK
 * - Developer Agent (Daytona sandbox): Executes coding tasks via Agent SDK
 *
 * All TypeScript, using only @anthropic-ai/claude-agent-sdk
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import type { Sandbox } from '@daytonaio/sdk';
import { Daytona } from '@daytonaio/sdk';
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { fileURLToPath } from 'url';
import {
	extract_developer_tasks,
	GREEN,
	is_task_complete,
	print_error,
	print_message,
	RESET,
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Validate environment
function validate_env(): void {
	const required = ['DAYTONA_API_KEY', 'ANTHROPIC_API_KEY'];
	const missing = required.filter((key) => !process.env[key]);

	if (missing.length > 0) {
		print_error(
			`Missing environment variables: ${missing.join(', ')}`,
		);
		print_error(
			'Copy .env.example to .env and fill in your API keys',
		);
		process.exit(1);
	}
}

// Project Manager system prompt
const PM_SYSTEM_PROMPT = `You are a Project Manager Agent coordinating a Developer Agent.

Your role:
1. Understand user requests and break them into coding tasks
2. Delegate tasks to the Developer Agent using <developer_task> tags
3. Review developer output and coordinate next steps
4. Communicate progress clearly to the user

To delegate a task, wrap it in XML tags:
<developer_task>
Build a React component that displays a user profile card with name, avatar, and bio.
</developer_task>

You can delegate multiple tasks in sequence. After each developer response,
analyze the output and decide whether to:
- Delegate another task
- Ask the user for clarification
- Report completion

When the overall goal is achieved, respond with TASK_COMPLETE.

Be concise. Focus on coordination, not implementation details.`;

class ProjectManagerAgent {
	private session_id: string | undefined;

	async chat(user_message: string): Promise<string> {
		let result = '';

		for await (const message of query({
			prompt: user_message,
			options: {
				systemPrompt: PM_SYSTEM_PROMPT,
				allowedTools: [], // PM doesn't need tools, just coordinates
				resume: this.session_id,
			},
		})) {
			// Capture session ID for conversation continuity
			if (message.type === 'system' && message.subtype === 'init') {
				this.session_id = message.session_id;
			}

			// Extract final result
			if (
				message.type === 'result' &&
				message.subtype === 'success'
			) {
				result = message.result;
			}
		}

		return result;
	}
}

class DeveloperAgent {
	private sandbox: Sandbox;

	constructor(sandbox: Sandbox) {
		this.sandbox = sandbox;
	}

	async execute_task(task: string): Promise<string> {
		print_message('system', 'Developer Agent executing task...');

		try {
			// Execute the sandbox agent with the task
			const escaped_task = task.replace(/'/g, "'\\''");
			const command = `cd /home/daytona && export PATH="$HOME/.bun/bin:$PATH" && ANTHROPIC_API_KEY="${process.env.SANDBOX_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY}" bun sandbox-agent.ts '${escaped_task}'`;

			const result =
				await this.sandbox.process.executeCommand(command);

			return result.result || 'Task completed (no output)';
		} catch (error) {
			const error_msg =
				error instanceof Error ? error.message : String(error);
			return `Developer Agent error: ${error_msg}`;
		}
	}
}

// Snapshot name - create with: bun src/create-snapshot.ts
const SNAPSHOT_NAME = 'ralph-town-dev';

async function setup_sandbox(daytona: Daytona): Promise<Sandbox> {
	print_message(
		'system',
		'Creating Daytona sandbox from snapshot...',
	);

	const sandbox = await daytona.create({
		snapshot: SNAPSHOT_NAME,
		language: 'typescript',
		envVars: {
			ANTHROPIC_API_KEY:
				process.env.SANDBOX_ANTHROPIC_API_KEY ||
				process.env.ANTHROPIC_API_KEY ||
				'',
		},
	});

	print_message('system', `Sandbox created: ${sandbox.id}`);

	// Upload sandbox agent code
	print_message('system', 'Uploading sandbox agent...');

	// When running with bun, __dirname is src/. When running compiled, it's dist/.
	// The sandbox-agent.ts source is always in src/
	const src_dir = __dirname.endsWith('dist')
		? path.join(__dirname, '..', 'src')
		: __dirname;
	const agent_path = path.join(src_dir, 'sandbox-agent.ts');
	const agent_code = fs.readFileSync(agent_path, 'utf-8');

	// uploadFile signature: (content: Buffer, destination: string)
	await sandbox.fs.uploadFile(
		Buffer.from(agent_code),
		'/home/daytona/sandbox-agent.ts',
	);

	// Get preview URL and set it
	const preview_url = await sandbox.getPreviewLink(80);
	await sandbox.process.executeCommand(
		`export PREVIEW_URL="${preview_url}"`,
	);

	print_message('system', `Preview URL: ${preview_url}`);
	print_message('system', 'Sandbox ready!');

	return sandbox;
}

async function run_agent_loop(
	pm: ProjectManagerAgent,
	dev: DeveloperAgent,
	user_input: string,
): Promise<void> {
	let pm_response = await pm.chat(user_input);
	print_message('pm', pm_response);

	// Agent loop: PM delegates to Dev until TASK_COMPLETE
	while (!is_task_complete(pm_response)) {
		const tasks = extract_developer_tasks(pm_response);

		if (tasks.length === 0) {
			// PM needs more info or is waiting
			break;
		}

		// Execute each developer task
		for (const task of tasks) {
			print_message('system', 'Delegating task to Developer Agent');
			const dev_result = await dev.execute_task(task);
			print_message('dev', dev_result);

			// Feed result back to PM
			pm_response = await pm.chat(
				`Developer Agent completed task. Result:\n${dev_result}`,
			);
			print_message('pm', pm_response);
		}
	}

	if (is_task_complete(pm_response)) {
		print_message('system', 'Task completed successfully!');
	}
}

async function main(): Promise<void> {
	validate_env();

	const daytona = new Daytona();
	let sandbox: Sandbox | null = null;

	// Cleanup on exit
	const cleanup = async (): Promise<void> => {
		if (sandbox) {
			print_message('system', 'Cleaning up sandbox...');
			try {
				await sandbox.delete();
				print_message('system', 'Sandbox deleted.');
			} catch {
				// Ignore cleanup errors
			}
		}
		process.exit(0);
	};

	process.on('SIGINT', cleanup);
	process.on('SIGTERM', cleanup);

	try {
		sandbox = await setup_sandbox(daytona);
		const pm = new ProjectManagerAgent();
		const dev = new DeveloperAgent(sandbox);

		// Interactive prompt loop
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		console.log(`\n${GREEN}Two-Agent System Ready${RESET}`);
		console.log('Enter your request (or "exit" to quit):\n');

		const prompt = (): void => {
			rl.question('> ', async (input) => {
				const trimmed = input.trim();

				if (trimmed.toLowerCase() === 'exit') {
					rl.close();
					await cleanup();
					return;
				}

				if (!trimmed) {
					prompt();
					return;
				}

				try {
					await run_agent_loop(pm, dev, trimmed);
				} catch (error) {
					print_error(
						error instanceof Error ? error.message : String(error),
					);
				}

				prompt();
			});
		};

		prompt();
	} catch (error) {
		print_error(
			error instanceof Error ? error.message : String(error),
		);
		await cleanup();
	}
}

main();
