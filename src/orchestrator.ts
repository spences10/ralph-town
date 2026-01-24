/**
 * Ralph Orchestrator
 *
 * Runs the Ralph Loop: iterate until acceptance criteria met
 * Supports multiple runtimes: daytona (default), devcontainer, local
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import {
	create_pull_request,
	finalize_git,
	setup_git,
} from './git-workflow.js';
import {
	create_runtime,
	validate_runtime_env,
	type RuntimeEnvironment,
} from './runtime/index.js';
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
	CriterionResult,
	GitConfig,
	LegacyAcceptanceCriterion,
	OrchestrationResult,
	RalphConfig,
	RalphCriterion,
} from './types.js';
import { GREEN, print_error, print_message, RESET } from './utils.js';

const SANDBOX_AGENT_CODE = readFileSync(
	new URL('./sandbox-agent.ts', import.meta.url),
	'utf-8',
);

/**
 * Get the next incomplete criterion
 */
function get_next_criterion(
	criteria: RalphCriterion[],
): RalphCriterion | null {
	return criteria.find((c) => !c.passes) || null;
}

/**
 * Convert steps array to task string for agent
 */
function steps_to_task(criterion: RalphCriterion): string {
	const steps_text = criterion.steps
		.map((s, i) => `${i + 1}. ${s}`)
		.join('\n');
	return `${criterion.description}\n\nSteps:\n${steps_text}`;
}

/**
 * Check a legacy acceptance criterion
 */
async function check_legacy_criterion(
	runtime: RuntimeEnvironment,
	criterion: LegacyAcceptanceCriterion,
): Promise<boolean> {
	switch (criterion.type) {
		case 'file_exists': {
			return runtime.file_exists(criterion.path);
		}
		case 'command_succeeds': {
			const result = await runtime.execute(criterion.command);
			return result.exit_code === 0;
		}
		default:
			return false;
	}
}

/**
 * Check all legacy acceptance criteria
 */
async function check_all_legacy_criteria(
	runtime: RuntimeEnvironment,
	criteria: LegacyAcceptanceCriterion[],
): Promise<boolean[]> {
	const results: boolean[] = [];
	for (const criterion of criteria) {
		results.push(await check_legacy_criterion(runtime, criterion));
	}
	return results;
}

/**
 * Set up the runtime environment
 */
async function setup_runtime(
	runtime: RuntimeEnvironment,
): Promise<void> {
	// Upload the sandbox agent code
	await runtime.write_file(
		`${runtime.get_workspace()}/sandbox-agent.ts`,
		SANDBOX_AGENT_CODE,
	);

	// Verify node available
	const node_check = await runtime.execute('node --version');
	if (node_check.exit_code !== 0) {
		throw new Error('Node.js not available in runtime');
	}
	print_message('system', `Node.js: ${node_check.stdout.trim()}`);
	print_message('system', 'Dependencies pre-installed via image');
}

/**
 * Agent execution result with usage stats
 */
interface AgentExecutionResult {
	output: string;
	usage: {
		input_tokens: number;
		output_tokens: number;
		total_cost_usd: number;
	};
}

/**
 * Parse usage JSON from agent output
 */
function parse_agent_usage(output: string): AgentExecutionResult {
	const usage_match = output.match(
		/__USAGE_JSON__(.+?)__USAGE_JSON__/,
	);
	let usage = {
		input_tokens: 0,
		output_tokens: 0,
		total_cost_usd: 0,
	};

	if (usage_match) {
		try {
			usage = JSON.parse(usage_match[1]);
		} catch {
			// Fallback to zeros
		}
	}

	const clean_output = output
		.replace(/__USAGE_JSON__.+?__USAGE_JSON__/, '')
		.trim();

	return { output: clean_output, usage };
}

/**
 * Run the agent task in the runtime
 */
async function run_agent(
	runtime: RuntimeEnvironment,
	task: string,
	working_dir?: string,
	previous_failure?: string,
	model: string = 'haiku',
): Promise<AgentExecutionResult> {
	let full_task = task;
	if (previous_failure) {
		full_task = `${task}\n\nNOTE: Previous attempt failed. ${previous_failure}`;
	}

	print_message(
		'system',
		`Running agent (${model}) with task: ${task.slice(0, 100)}...`,
	);

	const escaped_task = full_task
		.replace(/"/g, '\\"')
		.replace(/\n/g, '\\n');
	const work_dir = working_dir || runtime.get_workspace();
	const agent_path = `${runtime.get_workspace()}/sandbox-agent.ts`;

	const command = `export ANTHROPIC_API_KEY="${process.env.ANTHROPIC_API_KEY}" && export NODE_PATH=/usr/local/lib/node_modules && cd ${work_dir} && tsx ${agent_path} "${escaped_task}" "${model}"`;

	const result = await runtime.execute(command, { timeout: 600000 });

	return parse_agent_usage(result.stdout);
}

/**
 * Run a single criterion in its own isolated runtime (parallel mode)
 */
async function run_criterion_isolated(
	criterion: RalphCriterion,
	config: RalphConfig,
	criterion_index: number,
	total_criteria: number,
): Promise<CriterionResult> {
	const start_time = Date.now();
	let iterations = 0;
	let tokens_used = 0;
	const max_iter = config.max_iterations_per_criterion || 3;

	const runtime_type = config.execution?.runtime || 'daytona';
	const runtime = create_runtime({ type: runtime_type });

	// Generate unique branch name for this criterion
	const base_branch = config.git?.feature_branch || 'feature/ralph';
	const criterion_branch = `${base_branch}/${criterion.id}`;

	print_message(
		'system',
		`[${criterion.id}] Starting isolated runtime (${criterion_index + 1}/${total_criteria})`,
	);

	try {
		await runtime.initialize();
		print_message(
			'system',
			`[${criterion.id}] Runtime: ${runtime.id}`,
		);

		await setup_runtime(runtime);

		let working_dir = runtime.get_workspace();
		if (config.repository && config.git) {
			const criterion_git: GitConfig = {
				...config.git,
				feature_branch: criterion_branch,
				pr_title: `${criterion.id}: ${criterion.description}`,
				pr_body: `## ${criterion.description}\n\nSteps:\n${criterion.steps.map((s) => `- ${s}`).join('\n')}\n\n---\n*Automated by Ralph Loop (parallel mode)*`,
			};
			working_dir = await setup_git(
				runtime,
				config.repository,
				criterion_git,
			);
		}

		let previous_failure: string | undefined;

		while (iterations < max_iter) {
			iterations++;
			print_message(
				'system',
				`[${criterion.id}] Iteration ${iterations}/${max_iter}`,
			);

			const task = steps_to_task(criterion);
			const model = config.execution?.model || 'haiku';
			const agent_result = await run_agent(
				runtime,
				task,
				working_dir,
				previous_failure,
				model,
			);

			tokens_used +=
				agent_result.usage.input_tokens +
				agent_result.usage.output_tokens;

			print_message(
				'system',
				`[${criterion.id}] Checking backpressure...`,
			);
			const bp_result = await runtime.execute(
				criterion.backpressure,
				{
					cwd: working_dir,
					timeout: 120000,
				},
			);
			const passed = bp_result.exit_code === 0;

			if (passed) {
				print_message(
					'system',
					`[${criterion.id}] ${GREEN}PASS${RESET}`,
				);

				let pr_url: string | null = null;
				if (config.repository && config.git) {
					const criterion_git: GitConfig = {
						...config.git,
						feature_branch: criterion_branch,
						pr_title: `${criterion.id}: ${criterion.description}`,
						pr_body: `## ${criterion.description}\n\nSteps:\n${criterion.steps.map((s) => `- ${s}`).join('\n')}\n\n---\n*Automated by Ralph Loop (parallel mode)*`,
					};
					await finalize_git(
						runtime,
						criterion_git,
						criterion.description,
					);
					pr_url = await create_pull_request(
						config.repository,
						criterion_git,
						criterion.description,
					);
				}

				return {
					id: criterion.id,
					status: 'success',
					iterations,
					tokens_used,
					duration_ms: Date.now() - start_time,
					pr_url,
				};
			} else {
				const error_output = bp_result.stdout.slice(0, 1000);
				previous_failure = `Backpressure failed: ${criterion.backpressure}\nOutput: ${error_output}`;
				print_message(
					'system',
					`[${criterion.id}] FAIL - retrying...`,
				);
			}
		}

		print_message(
			'system',
			`[${criterion.id}] Max iterations reached`,
		);
		return {
			id: criterion.id,
			status: 'max_iterations',
			iterations,
			tokens_used,
			duration_ms: Date.now() - start_time,
		};
	} catch (error) {
		const error_msg =
			error instanceof Error ? error.message : String(error);
		print_error(`[${criterion.id}] Error: ${error_msg}`);
		return {
			id: criterion.id,
			status: 'error',
			iterations,
			tokens_used,
			duration_ms: Date.now() - start_time,
			error: error_msg,
		};
	} finally {
		print_message(
			'system',
			`[${criterion.id}] Cleaning up runtime...`,
		);
		await runtime.cleanup();
	}
}

/**
 * Run criteria in parallel using separate runtimes
 */
async function orchestrate_parallel(
	config: RalphConfig,
): Promise<OrchestrationResult> {
	init_telemetry();
	const start_time = Date.now();

	const criteria = config.acceptance_criteria || [];
	const max_concurrent = config.execution?.max_concurrent || 3;

	print_message(
		'system',
		`Starting parallel orchestration: ${criteria.length} criteria, max ${max_concurrent} concurrent`,
	);

	const telem_trace = create_ralph_trace({
		task: 'parallel-orchestration',
		features: criteria.map((c) => ({
			id: c.id,
			description: c.description,
			task: steps_to_task(c),
			backpressure: c.backpressure,
			passes: c.passes,
		})),
		max_iterations:
			(config.max_iterations_per_criterion || 3) * criteria.length,
		budget_tokens: config.budget.max_tokens,
	});

	const results: CriterionResult[] = [];
	const pending = [...criteria];
	const running: Promise<CriterionResult>[] = [];

	while (pending.length > 0 || running.length > 0) {
		while (running.length < max_concurrent && pending.length > 0) {
			const criterion = pending.shift()!;
			const index = criteria.indexOf(criterion);
			const promise = run_criterion_isolated(
				criterion,
				config,
				index,
				criteria.length,
			);
			running.push(promise);
		}

		if (running.length > 0) {
			const completed = await Promise.race(running);
			results.push(completed);

			const completed_index = running.findIndex(
				async (p) => (await p).id === completed.id,
			);
			if (completed_index !== -1) {
				running.splice(completed_index, 1);
			}
		}
	}

	const total_iterations = results.reduce(
		(sum, r) => sum + r.iterations,
		0,
	);
	const total_tokens = results.reduce(
		(sum, r) => sum + r.tokens_used,
		0,
	);
	const all_success = results.every((r) => r.status === 'success');
	const criteria_met = results.map((r) => r.status === 'success');

	finalize_trace(telem_trace, {
		status: all_success ? 'success' : 'max_iterations',
		iterations: total_iterations,
		tokens_used: total_tokens,
		duration_ms: Date.now() - start_time,
		features_completed: results.filter((r) => r.status === 'success')
			.length,
	});

	await flush_telemetry();

	print_message(
		'system',
		`\n${GREEN}Parallel orchestration complete${RESET}`,
	);
	print_message(
		'system',
		`Results: ${results.filter((r) => r.status === 'success').length}/${criteria.length} succeeded`,
	);

	const prs = results.filter((r) => r.pr_url).map((r) => r.pr_url);
	if (prs.length > 0) {
		print_message('system', `PRs created:`);
		prs.forEach((url) => print_message('system', `  ${url}`));
	}

	return {
		status: all_success ? 'success' : 'max_iterations',
		iterations: total_iterations,
		criteria_met,
		metrics: {
			tokens_used: total_tokens,
			duration_ms: Date.now() - start_time,
		},
		criterion_results: results,
	};
}

/**
 * Main orchestration loop
 */
export async function orchestrate(
	config: RalphConfig,
): Promise<OrchestrationResult> {
	// Check for parallel mode first
	if (
		config.execution?.mode === 'parallel' &&
		config.acceptance_criteria &&
		config.acceptance_criteria.length > 0
	) {
		return orchestrate_parallel(config);
	}

	init_telemetry();
	const start_time = Date.now();
	let iterations = 0;
	let tokens_used = 0;
	let criteria_completed = 0;

	// Validate environment
	const runtime_type = config.execution?.runtime || 'daytona';
	const missing_env = validate_runtime_env(runtime_type);
	if (missing_env.length > 0) {
		throw new Error(
			`Missing required env vars: ${missing_env.join(', ')}`,
		);
	}

	// Create runtime
	const runtime = create_runtime({
		type: runtime_type,
		on_build_log: (chunk) => {
			if (chunk.trim()) {
				print_message('system', `[build] ${chunk.trim()}`);
			}
		},
	});

	const is_ralph_mode =
		config.acceptance_criteria &&
		config.acceptance_criteria.length > 0;

	const telem_trace = create_ralph_trace({
		task: config.task,
		features: config.acceptance_criteria?.map((c) => ({
			id: c.id,
			description: c.description,
			task: steps_to_task(c),
			backpressure: c.backpressure,
			passes: c.passes,
		})),
		max_iterations: is_ralph_mode
			? (config.max_iterations_per_criterion || 3) *
				config.acceptance_criteria!.length
			: config.max_iterations || 3,
		budget_tokens: config.budget.max_tokens,
	});

	const max_iter = is_ralph_mode
		? (config.max_iterations_per_criterion || 3) *
			config.acceptance_criteria!.length
		: config.max_iterations || 3;

	if (is_ralph_mode) {
		const pending = config.acceptance_criteria!.filter(
			(c) => !c.passes,
		).length;
		print_message(
			'system',
			`Starting Ralph Loop: ${pending} criteria pending`,
		);
	} else {
		print_message(
			'system',
			`Starting Ralph Loop for: ${config.task}`,
		);
	}
	print_message(
		'system',
		`Runtime: ${runtime_type}, Max iterations: ${max_iter}, Budget: ${config.budget.max_tokens} tokens`,
	);

	try {
		print_message('system', 'Initializing runtime...');
		await runtime.initialize();
		print_message('system', `Runtime ready: ${runtime.id}`);

		await setup_runtime(runtime);

		const has_git = config.repository && config.git;
		let working_dir = runtime.get_workspace();

		if (has_git && config.repository && config.git) {
			working_dir = await setup_git(
				runtime,
				config.repository,
				config.git,
			);
		}

		let previous_failure: string | undefined;

		while (iterations < max_iter) {
			iterations++;

			if (is_ralph_mode && config.acceptance_criteria) {
				const criterion = get_next_criterion(
					config.acceptance_criteria,
				);

				if (!criterion) {
					print_message(
						'system',
						`\n${GREEN}All ${config.acceptance_criteria.length} criteria complete!${RESET}`,
					);

					let pr_url: string | null = null;
					if (has_git && config.repository && config.git) {
						const summary = config.acceptance_criteria
							.map((c) => `- ${c.description}`)
							.join('\n');
						await finalize_git(runtime, config.git, summary);
						pr_url = await create_pull_request(
							config.repository,
							config.git,
							summary,
						);
					}

					const result: OrchestrationResult = {
						status: 'success',
						iterations,
						criteria_met: config.acceptance_criteria.map(
							(c) => c.passes,
						),
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
						features_completed: config.acceptance_criteria.length,
						pr_url: result.pr_url,
					});
					return result;
				}

				print_message(
					'system',
					`\n--- Criterion: ${criterion.id} (${criteria_completed}/${config.acceptance_criteria.length}) ---`,
				);
				print_message('system', `Task: ${criterion.description}`);

				const iter_span = create_iteration_span(
					telem_trace,
					iterations,
					criterion.id,
				);
				const task = steps_to_task(criterion);
				const model = config.execution?.model || 'haiku';

				const agent_gen = create_agent_generation(iter_span, task);
				const agent_result = await run_agent(
					runtime,
					task,
					working_dir,
					previous_failure,
					model,
				);
				if (agent_gen) {
					agent_gen.end({
						output: agent_result.output.slice(0, 2000),
					});
				}
				print_message(
					'dev',
					agent_result.output.slice(0, 500) + '...',
				);

				tokens_used +=
					agent_result.usage.input_tokens +
					agent_result.usage.output_tokens;

				print_message('system', 'Checking backpressure...');
				const bp_result = await runtime.execute(
					criterion.backpressure,
					{
						cwd: working_dir,
						timeout: 120000,
					},
				);
				const passed = bp_result.exit_code === 0;

				record_backpressure(
					iter_span,
					criterion.backpressure,
					passed,
					bp_result.stdout,
				);

				if (iter_span) {
					iter_span.end();
				}

				if (passed) {
					criterion.passes = true;
					criteria_completed++;
					previous_failure = undefined;
					print_message(
						'system',
						`${GREEN}PASS${RESET} - ${criterion.id} complete`,
					);
				} else {
					const error_output = bp_result.stdout.slice(0, 1000);
					previous_failure = `Backpressure command failed: ${criterion.backpressure}\nOutput: ${error_output}`;
					print_message(
						'system',
						`FAIL - ${criterion.id} backpressure: ${criterion.backpressure}`,
					);
				}
			} else if (config.task && config.legacy_criteria) {
				print_message(
					'system',
					`\n--- Iteration ${iterations}/${max_iter} ---`,
				);

				const model = config.execution?.model || 'haiku';
				const agent_result = await run_agent(
					runtime,
					config.task,
					working_dir,
					undefined,
					model,
				);
				print_message(
					'dev',
					agent_result.output.slice(0, 500) + '...',
				);

				tokens_used +=
					agent_result.usage.input_tokens +
					agent_result.usage.output_tokens;

				print_message('system', 'Checking acceptance criteria...');
				const criteria_results = await check_all_legacy_criteria(
					runtime,
					config.legacy_criteria,
				);

				config.legacy_criteria.forEach((c, i) => {
					const status = criteria_results[i]
						? `${GREEN}PASS${RESET}`
						: 'FAIL';
					print_message(
						'system',
						`  ${c.type}: ${c.type === 'file_exists' ? c.path : c.command} - ${status}`,
					);
				});

				if (criteria_results.every((m) => m)) {
					print_message(
						'system',
						`\n${GREEN}All acceptance criteria met!${RESET}`,
					);

					let pr_url: string | null = null;
					if (has_git && config.repository && config.git) {
						await finalize_git(runtime, config.git, config.task);
						pr_url = await create_pull_request(
							config.repository,
							config.git,
							config.task,
						);
					}

					return {
						status: 'success',
						iterations,
						criteria_met: criteria_results,
						metrics: {
							tokens_used,
							duration_ms: Date.now() - start_time,
						},
						pr_url,
					} as OrchestrationResult;
				}
			}

			if (tokens_used >= config.budget.max_tokens) {
				print_message('system', 'Budget exhausted');
				return {
					status: 'budget_exhausted',
					iterations,
					criteria_met: is_ralph_mode
						? config.acceptance_criteria!.map((c) => c.passes)
						: [],
					metrics: {
						tokens_used,
						duration_ms: Date.now() - start_time,
					},
				};
			}
		}

		print_message('system', 'Max iterations reached');
		return {
			status: 'max_iterations',
			iterations,
			criteria_met: is_ralph_mode
				? config.acceptance_criteria!.map((c) => c.passes)
				: config.legacy_criteria
					? await check_all_legacy_criteria(
							runtime,
							config.legacy_criteria,
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
		print_message('system', 'Cleaning up runtime...');
		await runtime.cleanup();
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
