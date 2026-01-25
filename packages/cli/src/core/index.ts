/**
 * @ralph-town/core
 * Core library for Ralph Loop orchestration
 */

// Types
export type {
	RalphConfig,
	RalphCriterion,
	LegacyAcceptanceCriterion,
	RepositoryConfig,
	GitConfig,
	ExecutionConfig,
	OrchestrationResult,
	CriterionResult,
} from './types.js';

// Runtime
export {
	create_runtime,
	validate_runtime_env,
} from './runtime/index.js';
export type {
	RuntimeEnvironment,
	RuntimeType,
	ExecuteOptions,
	ExecuteResult,
} from './runtime/types.js';

// Orchestrator
export { orchestrate, run_ralph_loop } from './orchestrator.js';
export type { RunResult } from './orchestrator.js';

// Utils
export { print_message, print_error } from './utils.js';

// Git workflow
export { setup_git, finalize_git, create_pull_request } from './git-workflow.js';
