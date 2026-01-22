/**
 * Ralph Orchestrator - Minimal CLI for design validation
 *
 * Runs the Ralph Loop: iterate until acceptance criteria met
 */

import { Daytona, Image } from '@daytonaio/sdk';
import { exec } from 'child_process';
import 'dotenv/config';
import { readFileSync } from 'fs';
import { promisify } from 'util';
import {
	create_agent_generation,
	create_iteration_span,
	create_ralph_trace,
	finalize_trace,
	flush_telemetry,
	init_telemetry,
	record_backpressure,
} from './telemetry.js';
import type {
	AcceptanceCriterion,
	Feature,
	GitConfig,
	OrchestrationResult,
	RalphConfig,
	RepositoryConfig,
} from './types.js';
import { GREEN, print_error, print_message, RESET } from './utils.js';

const exec_async = promisify(exec);

const SANDBOX_AGENT_CODE = readFileSync(
	new URL('./sandbox-agent.ts', import.meta.url),
	'utf-8',
);

/**
 * Declarative image with pre-baked dependencies
 * - Node.js 22 slim base
 * - tsx for running TypeScript
 * - Claude Agent SDK
 * - gh CLI for PR creation (future)
 *
 * Cached for 24 hours per Daytona runner
 */
const RALPH_IMAGE = Image.base('node:22-slim').dockerfileCommands([
	'RUN apt-get update && apt-get install -y git curl && rm -rf /var/lib/apt/lists/*',
	'RUN npm install -g tsx @anthropic-ai/claude-agent-sdk',
]);

/**
 * Check a single acceptance criterion in the sandbox
 */
async function check_criterion(
	sandbox: Awaited<ReturnType<Daytona['create']>>,
	criterion: AcceptanceCriterion,
): Promise<boolean> {
	switch (criterion.type) {
		case 'file_exists': {
			const result = await sandbox.process.executeCommand(
				`test -f "${criterion.path}" && echo "EXISTS" || echo "MISSING"`,
			);
			return result.result.trim() === 'EXISTS';
		}
		case 'command_succeeds': {
			const result = await sandbox.process.executeCommand(
				criterion.command,
			);
			return result.exitCode === 0;
		}
		default:
			return false;
	}
}

/**
 * Check all acceptance criteria
 */
async function check_all_criteria(
	sandbox: Awaited<ReturnType<Daytona['create']>>,
	criteria: AcceptanceCriterion[],
): Promise<boolean[]> {
	const results: boolean[] = [];
	for (const criterion of criteria) {
		results.push(await check_criterion(sandbox, criterion));
	}
	return results;
}

/**
 * Get the next incomplete feature
 */
function get_next_feature(features: Feature[]): Feature | null {
	return features.find((f) => !f.passes) || null;
}

/**
 * Set up the sandbox environment
 * Dependencies are pre-baked via Declarative Builder
 */
async function setup_sandbox(
	sandbox: Awaited<ReturnType<Daytona['create']>>,
): Promise<void> {
	// Upload the sandbox agent code
	await sandbox.fs.uploadFile(
		Buffer.from(SANDBOX_AGENT_CODE),
		'/home/daytona/sandbox-agent.ts',
	);

	// Verify Node.js is available (baked into image)
	const node_check =
		await sandbox.process.executeCommand('node --version');
	if (node_check.exitCode !== 0) {
		throw new Error('Node.js not available in sandbox');
	}
	print_message('system', `Node.js: ${node_check.result.trim()}`);

	// Dependencies are pre-installed in RALPH_IMAGE
	// No npm install needed - tsx and claude-agent-sdk are globally available
	print_message('system', 'Dependencies pre-installed via image');
}

const REPO_PATH = '/home/daytona/workspace';

/**
 * Set up git repository in sandbox
 * Clone repo and create feature branch
 */
async function setup_git(
	sandbox: Awaited<ReturnType<Daytona['create']>>,
	repo: RepositoryConfig,
	git: GitConfig,
): Promise<void> {
	const github_pat = process.env.GITHUB_PAT;
	if (!github_pat) {
		throw new Error(
			'GITHUB_PAT environment variable required for git workflow',
		);
	}

	const branch = repo.branch || 'main';

	print_message('system', `Cloning ${repo.url} (${branch})...`);

	// Clone repository using SDK git
	await sandbox.git.clone(
		repo.url,
		REPO_PATH,
		branch,
		undefined, // commitId
		'git',
		github_pat,
	);

	print_message('system', `Creating branch: ${git.feature_branch}`);

	// Create and checkout feature branch
	await sandbox.git.createBranch(REPO_PATH, git.feature_branch);
	await sandbox.git.checkoutBranch(REPO_PATH, git.feature_branch);

	// Configure git user for commits
	const author = git.commit_author || 'Ralph Agent';
	const email = git.commit_email || 'ralph@example.com';
	await sandbox.process.executeCommand(
		`cd ${REPO_PATH} && git config user.name "${author}" && git config user.email "${email}"`,
	);

	print_message('system', `Git ready: ${git.feature_branch}`);
}

/**
 * Finalize git changes
 * Stage, commit, and push changes
 */
async function finalize_git(
	sandbox: Awaited<ReturnType<Daytona['create']>>,
	git: GitConfig,
	task: string,
): Promise<void> {
	const github_pat = process.env.GITHUB_PAT;
	if (!github_pat) {
		throw new Error('GITHUB_PAT required for git push');
	}

	// Check if there are changes to commit
	const status = await sandbox.git.status(REPO_PATH);
	const has_changes =
		status.fileStatus && status.fileStatus.length > 0;

	if (!has_changes) {
		print_message('system', 'No changes to commit');
		return;
	}

	print_message('system', 'Staging changes...');

	// Stage all changed files
	const files_to_add = status.fileStatus.map((f) => f.name);
	if (files_to_add.length > 0) {
		await sandbox.git.add(REPO_PATH, files_to_add);
	}

	// Generate commit message
	const message = git.commit_message || `feat: ${task.slice(0, 50)}`;
	const author = git.commit_author || 'Ralph Agent';
	const email = git.commit_email || 'ralph@example.com';

	print_message('system', `Committing: ${message}`);

	await sandbox.git.commit(REPO_PATH, message, author, email);

	print_message('system', `Pushing to ${git.feature_branch}...`);

	await sandbox.git.push(REPO_PATH, 'git', github_pat);

	print_message(
		'system',
		`${GREEN}Pushed to ${git.feature_branch}${RESET}`,
	);
}

/**
 * Create a pull request using local gh CLI
 */
async function create_pull_request(
	repo: RepositoryConfig,
	git: GitConfig,
	task: string,
): Promise<string | null> {
	if (!git.create_pr) {
		return null;
	}

	const title = git.pr_title || `feat: ${task.slice(0, 50)}`;
	const body =
		git.pr_body ||
		`## Summary\n\nAutomated by Ralph Loop.\n\n**Task:** ${task}`;

	// Extract owner/repo from URL
	const match = repo.url.match(/github\.com[:/](.+?)(?:\.git)?$/);
	if (!match) {
		print_error('Could not parse repo URL for PR creation');
		return null;
	}
	const repo_path = match[1];

	print_message('system', `Creating PR: ${title}`);

	try {
		const { stdout } = await exec_async(
			`gh pr create --repo "${repo_path}" --head "${git.feature_branch}" --title "${title}" --body "${body.replace(/"/g, '\\"')}"`,
		);
		const pr_url = stdout.trim();
		print_message('system', `${GREEN}PR created: ${pr_url}${RESET}`);
		return pr_url;
	} catch (error) {
		const err_msg =
			error instanceof Error ? error.message : String(error);
		print_error(`Failed to create PR: ${err_msg}`);
		return null;
	}
}

/**
 * Run the agent task in the sandbox
 * Each call creates a fresh Claude session (true Ralph pattern)
 *
 * @param previous_failure - Optional context about what failed in previous iteration
 */
async function run_agent_in_sandbox(
	sandbox: Awaited<ReturnType<Daytona['create']>>,
	task: string,
	working_dir?: string,
	previous_failure?: string,
): Promise<string> {
	// Build the full prompt with context
	let full_task = task;
	if (previous_failure) {
		full_task = `${task}\n\nNOTE: Previous attempt failed. ${previous_failure}`;
	}

	print_message('system', `Running agent with task: ${task}`);

	const escaped_task = full_task
		.replace(/"/g, '\\"')
		.replace(/\n/g, '\\n');
	// tsx and claude-agent-sdk are globally installed via RALPH_IMAGE
	// NODE_PATH needed so globally installed modules are resolvable
	const work_dir = working_dir || '/home/daytona';
	const command = `export ANTHROPIC_API_KEY="${process.env.ANTHROPIC_API_KEY}" && export NODE_PATH=/usr/local/lib/node_modules && cd ${work_dir} && tsx /home/daytona/sandbox-agent.ts "${escaped_task}"`;

	// Agent tasks can take several minutes - Claude API calls + file operations
	// 600 seconds (10 min) allows for complex multi-step tasks
	const result = await sandbox.process.executeCommand(
		command,
		undefined,
		undefined,
		600,
	);

	return result.result;
}

/**
 * Main orchestration loop
 * Supports two modes:
 * 1. Feature list mode (recommended): iterate through features until all pass
 * 2. Single task mode (legacy): run one task until acceptance criteria met
 */
export async function orchestrate(
	config: RalphConfig,
): Promise<OrchestrationResult> {
	// Initialize telemetry
	init_telemetry();

	const start_time = Date.now();
	let iterations = 0;
	let tokens_used = 0;
	let features_completed = 0;

	// Determine mode
	const is_feature_mode =
		config.features && config.features.length > 0;

	// Create telemetry trace
	const telem_trace = create_ralph_trace({
		task: config.task,
		features: config.features,
		max_iterations: is_feature_mode
			? (config.max_iterations_per_feature || 3) *
				config.features!.length
			: config.max_iterations || 3,
		budget_tokens: config.budget.max_tokens,
	});
	const max_iter = is_feature_mode
		? (config.max_iterations_per_feature || 3) *
			config.features!.length
		: config.max_iterations || 3;

	if (is_feature_mode) {
		const pending = config.features!.filter((f) => !f.passes).length;
		print_message(
			'system',
			`Starting Ralph Loop: ${pending} features pending`,
		);
	} else {
		print_message(
			'system',
			`Starting Ralph Loop for: ${config.task}`,
		);
	}
	print_message(
		'system',
		`Max iterations: ${max_iter}, Budget: ${config.budget.max_tokens} tokens`,
	);

	const daytona = new Daytona();
	let sandbox: Awaited<ReturnType<Daytona['create']>> | null = null;

	try {
		// Create sandbox with pre-built image
		// First run builds image (~30s), subsequent runs use cache (~5s)
		print_message('system', 'Creating Daytona sandbox...');
		sandbox = await daytona.create(
			{
				image: RALPH_IMAGE,
				language: 'typescript',
			},
			{
				timeout: 120,
				onSnapshotCreateLogs: (chunk) => {
					// Show build progress on first run
					if (chunk.trim()) {
						print_message('system', `[build] ${chunk.trim()}`);
					}
				},
			},
		);
		print_message('system', `Sandbox created: ${sandbox.id}`);

		// Set up sandbox environment (once)
		await setup_sandbox(sandbox);

		// Set up git if repository configured
		const has_git = config.repository && config.git;
		let working_dir = '/home/daytona';

		if (has_git && config.repository && config.git) {
			await setup_git(sandbox, config.repository, config.git);
			working_dir = config.repository.working_dir
				? `${REPO_PATH}/${config.repository.working_dir}`
				: REPO_PATH;
		}

		// Track previous failure for context passing
		let previous_failure: string | undefined;

		// Main loop - feature list mode or single task mode
		while (iterations < max_iter) {
			iterations++;

			// Feature list mode
			if (is_feature_mode && config.features) {
				const feature = get_next_feature(config.features);

				// All features complete
				if (!feature) {
					print_message(
						'system',
						`\n${GREEN}All ${config.features.length} features complete!${RESET}`,
					);

					// Finalize git with all features
					let pr_url: string | null = null;
					if (has_git && config.repository && config.git) {
						const summary = config.features
							.map((f) => `- ${f.description}`)
							.join('\n');
						await finalize_git(sandbox, config.git, summary);
						pr_url = await create_pull_request(
							config.repository,
							config.git,
							summary,
						);
					}

					const result: OrchestrationResult = {
						status: 'success',
						iterations,
						criteria_met: config.features.map((f) => f.passes),
						metrics: {
							tokens_used,
							duration_ms: Date.now() - start_time,
						},
						pr_url,
					};
					finalize_trace(telem_trace, {
						status: result.status,
						iterations: result.iterations,
						tokens_used: result.metrics.tokens_used,
						duration_ms: result.metrics.duration_ms,
						features_completed: config.features.length,
						pr_url: result.pr_url,
					});
					return result;
				}

				print_message(
					'system',
					`\n--- Feature: ${feature.id} (${features_completed}/${config.features.length}) ---`,
				);
				print_message('system', `Task: ${feature.description}`);

				// Create telemetry span for this iteration
				const iter_span = create_iteration_span(
					telem_trace,
					iterations,
					feature.id,
				);

				// Run agent for this feature (fresh Claude session each time)
				const agent_gen = create_agent_generation(
					iter_span,
					feature.task,
				);
				const output = await run_agent_in_sandbox(
					sandbox,
					feature.task,
					working_dir,
					previous_failure,
				);
				if (agent_gen) {
					agent_gen.end({ output: output.slice(0, 2000) });
				}
				print_message('dev', output.slice(0, 500) + '...');

				// Check backpressure
				print_message('system', 'Checking backpressure...');
				const bp_result = await sandbox.process.executeCommand(
					feature.backpressure,
					undefined,
					undefined,
					120,
				);
				const passed = bp_result.exitCode === 0;

				// Record backpressure result in telemetry
				record_backpressure(
					iter_span,
					feature.backpressure,
					passed,
					bp_result.result,
				);

				if (iter_span) {
					iter_span.end();
				}

				if (passed) {
					feature.passes = true;
					features_completed++;
					previous_failure = undefined; // Clear failure context
					print_message(
						'system',
						`${GREEN}PASS${RESET} - ${feature.id} complete`,
					);
				} else {
					// Capture failure context for next iteration
					const error_output = bp_result.result.slice(0, 500);
					previous_failure = `Backpressure command failed: ${feature.backpressure}\nOutput: ${error_output}`;
					print_message(
						'system',
						`FAIL - ${feature.id} backpressure: ${feature.backpressure}`,
					);
				}
			}
			// Single task mode (legacy)
			else if (config.task && config.acceptance_criteria) {
				print_message(
					'system',
					`\n--- Iteration ${iterations}/${max_iter} ---`,
				);

				// Run the agent
				const output = await run_agent_in_sandbox(
					sandbox,
					config.task,
					working_dir,
				);
				print_message('dev', output.slice(0, 500) + '...');

				// Check acceptance criteria
				print_message('system', 'Checking acceptance criteria...');
				const criteria_met = await check_all_criteria(
					sandbox,
					config.acceptance_criteria,
				);

				// Report status
				config.acceptance_criteria.forEach((c, i) => {
					const status = criteria_met[i]
						? `${GREEN}PASS${RESET}`
						: `FAIL`;
					print_message(
						'system',
						`  ${c.type}: ${c.type === 'file_exists' ? c.path : c.command} - ${status}`,
					);
				});

				// Check if all criteria met
				if (criteria_met.every((m) => m)) {
					print_message(
						'system',
						`\n${GREEN}All acceptance criteria met!${RESET}`,
					);

					// Finalize git if configured
					let pr_url: string | null = null;
					if (has_git && config.repository && config.git) {
						await finalize_git(sandbox, config.git, config.task);
						pr_url = await create_pull_request(
							config.repository,
							config.git,
							config.task,
						);
					}

					return {
						status: 'success',
						iterations,
						criteria_met,
						metrics: {
							tokens_used,
							duration_ms: Date.now() - start_time,
						},
						pr_url,
					} as OrchestrationResult;
				}
			}

			// TODO: Track actual token usage from agent response
			tokens_used += 1000; // Placeholder

			// Budget check
			if (tokens_used >= config.budget.max_tokens) {
				print_message('system', 'Budget exhausted');
				return {
					status: 'budget_exhausted',
					iterations,
					criteria_met: is_feature_mode
						? config.features!.map((f) => f.passes)
						: [],
					metrics: {
						tokens_used,
						duration_ms: Date.now() - start_time,
					},
				};
			}
		}

		// Max iterations reached
		print_message('system', 'Max iterations reached');
		return {
			status: 'max_iterations',
			iterations,
			criteria_met: is_feature_mode
				? config.features!.map((f) => f.passes)
				: config.acceptance_criteria
					? await check_all_criteria(
							sandbox,
							config.acceptance_criteria,
						)
					: [],
			metrics: {
				tokens_used,
				duration_ms: Date.now() - start_time,
			},
		};
	} catch (error) {
		const error_msg =
			error instanceof Error ? error.message : String(error);
		print_error(error_msg);
		return {
			status: 'error',
			iterations,
			criteria_met: [],
			metrics: {
				tokens_used,
				duration_ms: Date.now() - start_time,
			},
			error: error_msg,
		};
	} finally {
		// Cleanup
		if (sandbox) {
			print_message('system', 'Cleaning up sandbox...');
			await daytona.delete(sandbox);
		}

		// Flush telemetry
		await flush_telemetry();
	}
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
	const config_path = process.argv[2] || 'ralph.json';

	try {
		const config_text = readFileSync(config_path, 'utf-8');
		const config: RalphConfig = JSON.parse(config_text);

		print_message('system', `Loaded config from ${config_path}`);

		orchestrate(config).then((result) => {
			console.log('\n--- Result ---');
			console.log(JSON.stringify(result, null, 2));
			process.exit(result.status === 'success' ? 0 : 1);
		});
	} catch (error) {
		print_error(`Failed to load config: ${error}`);
		process.exit(1);
	}
}
