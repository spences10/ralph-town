/**
 * Two-Agent System with Daytona
 *
 * Architecture:
 * - Project Manager Agent (local): Plans and coordinates tasks via Agent SDK
 * - Developer Agent (Daytona sandbox): Executes coding tasks via Agent SDK
 *
 * All TypeScript, using only @anthropic-ai/claude-agent-sdk
 */

import 'dotenv/config';
import * as readline from 'readline';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { Daytona } from '@daytonaio/sdk';
import type { Sandbox } from '@daytonaio/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  printMessage,
  printError,
  extractDeveloperTasks,
  isTaskComplete,
  GREEN,
  RESET,
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Validate environment
function validateEnv(): void {
  const required = ['DAYTONA_API_KEY', 'ANTHROPIC_API_KEY'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    printError(`Missing environment variables: ${missing.join(', ')}`);
    printError('Copy .env.example to .env and fill in your API keys');
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
  private sessionId: string | undefined;

  async chat(userMessage: string): Promise<string> {
    let result = '';

    for await (const message of query({
      prompt: userMessage,
      options: {
        systemPrompt: PM_SYSTEM_PROMPT,
        allowedTools: [], // PM doesn't need tools, just coordinates
        resume: this.sessionId,
      },
    })) {
      // Capture session ID for conversation continuity
      if (message.type === 'system' && message.subtype === 'init') {
        this.sessionId = message.session_id;
      }

      // Extract final result
      if (message.type === 'result' && message.subtype === 'success') {
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

  async executeTask(task: string): Promise<string> {
    printMessage('system', 'Developer Agent executing task...');

    try {
      // Execute the sandbox agent with the task
      const escapedTask = task.replace(/'/g, "'\\''");
      const command = `cd /home/daytona && ANTHROPIC_API_KEY="${process.env.SANDBOX_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY}" npx tsx sandbox-agent.ts '${escapedTask}'`;

      const result = await this.sandbox.process.executeCommand(command);

      return result.result || 'Task completed (no output)';
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return `Developer Agent error: ${errorMsg}`;
    }
  }
}

async function setupSandbox(daytona: Daytona): Promise<Sandbox> {
  printMessage('system', 'Creating Daytona sandbox...');

  const sandbox = await daytona.create({
    language: 'typescript',
    envVars: {
      ANTHROPIC_API_KEY:
        process.env.SANDBOX_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '',
    },
  });

  printMessage('system', `Sandbox created: ${sandbox.id}`);

  // Install dependencies in sandbox
  printMessage('system', 'Installing Claude Agent SDK in sandbox...');

  await sandbox.process.executeCommand(
    'cd /home/daytona && npm init -y && npm install @anthropic-ai/claude-agent-sdk tsx'
  );

  // Upload sandbox agent code
  printMessage('system', 'Uploading sandbox agent...');

  const agentCode = fs.readFileSync(path.join(__dirname, 'sandbox-agent.ts'), 'utf-8');

  await sandbox.fs.uploadFile('/home/daytona/sandbox-agent.ts', agentCode);

  // Get preview URL and set it
  const previewUrl = await sandbox.getPreviewLink(80);
  await sandbox.process.executeCommand(`export PREVIEW_URL="${previewUrl}"`);

  printMessage('system', `Preview URL: ${previewUrl}`);
  printMessage('system', 'Sandbox ready!');

  return sandbox;
}

async function runAgentLoop(
  pm: ProjectManagerAgent,
  dev: DeveloperAgent,
  userInput: string
): Promise<void> {
  let pmResponse = await pm.chat(userInput);
  printMessage('pm', pmResponse);

  // Agent loop: PM delegates to Dev until TASK_COMPLETE
  while (!isTaskComplete(pmResponse)) {
    const tasks = extractDeveloperTasks(pmResponse);

    if (tasks.length === 0) {
      // PM needs more info or is waiting
      break;
    }

    // Execute each developer task
    for (const task of tasks) {
      printMessage('system', 'Delegating task to Developer Agent');
      const devResult = await dev.executeTask(task);
      printMessage('dev', devResult);

      // Feed result back to PM
      pmResponse = await pm.chat(`Developer Agent completed task. Result:\n${devResult}`);
      printMessage('pm', pmResponse);
    }
  }

  if (isTaskComplete(pmResponse)) {
    printMessage('system', 'Task completed successfully!');
  }
}

async function main(): Promise<void> {
  validateEnv();

  const daytona = new Daytona();
  let sandbox: Sandbox | null = null;

  // Cleanup on exit
  const cleanup = async (): Promise<void> => {
    if (sandbox) {
      printMessage('system', 'Cleaning up sandbox...');
      try {
        await sandbox.delete();
        printMessage('system', 'Sandbox deleted.');
      } catch {
        // Ignore cleanup errors
      }
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  try {
    sandbox = await setupSandbox(daytona);
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
          await runAgentLoop(pm, dev, trimmed);
        } catch (error) {
          printError(error instanceof Error ? error.message : String(error));
        }

        prompt();
      });
    };

    prompt();
  } catch (error) {
    printError(error instanceof Error ? error.message : String(error));
    await cleanup();
  }
}

main();
