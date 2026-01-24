/**
 * Ralph-GAS type definitions
 */

// Ralph acceptance criterion (primary format)
export interface RalphCriterion {
	id: string;
	description: string;
	steps: string[]; // implementation steps for the agent
	backpressure: string; // command to verify completion
	passes: boolean;
}

// Legacy acceptance criteria types (single-task mode)
export type LegacyAcceptanceCriterion =
	| FileExistsCriterion
	| CommandSucceedsCriterion;

export interface FileExistsCriterion {
	type: 'file_exists';
	path: string;
}

export interface CommandSucceedsCriterion {
	type: 'command_succeeds';
	command: string;
}

// Repository configuration for git workflow
export interface RepositoryConfig {
	url: string;
	branch?: string; // default: 'main'
	working_dir?: string; // subdirectory to work in
}

// Git workflow configuration
export interface GitConfig {
	feature_branch: string; // e.g., 'feature/ralph-123'
	commit_author?: string; // default: 'Ralph Agent'
	commit_email?: string; // default: 'ralph@example.com'
	commit_message?: string; // default: auto-generated
	create_pr?: boolean; // default: false
	pr_title?: string;
	pr_body?: string;
}

// Runtime type
export type RuntimeType = 'daytona' | 'local' | 'devcontainer';

// Execution configuration
export interface ExecutionConfig {
	mode: 'sequential' | 'parallel';
	runtime?: RuntimeType; // default: 'daytona'
	max_concurrent?: number; // default: 3 for parallel mode
	model?: 'haiku' | 'sonnet' | 'opus'; // default: 'haiku'
}

// Ralph configuration
export interface RalphConfig {
	// Ralph pattern (primary) - list of acceptance criteria with steps
	acceptance_criteria?: RalphCriterion[];
	max_iterations_per_criterion?: number; // default: 3

	// Execution mode
	execution?: ExecutionConfig; // default: { mode: 'sequential' }

	// Legacy single task mode
	task?: string;
	legacy_criteria?: LegacyAcceptanceCriterion[];
	max_iterations?: number;

	// Git workflow
	repository?: RepositoryConfig;
	git?: GitConfig;

	// Budget
	budget: {
		max_tokens: number;
		max_cost_usd?: number;
	};
}

// Per-criterion result (for parallel mode)
export interface CriterionResult {
	id: string;
	status: 'success' | 'max_iterations' | 'error';
	iterations: number;
	tokens_used: number;
	duration_ms: number;
	pr_url?: string | null;
	error?: string;
}

// Orchestration result
export interface OrchestrationResult {
	status: 'success' | 'max_iterations' | 'budget_exhausted' | 'error';
	iterations: number;
	criteria_met: boolean[];
	metrics: {
		tokens_used: number;
		duration_ms: number;
	};
	error?: string;
	pr_url?: string | null;
	// Parallel mode results
	criterion_results?: CriterionResult[];
}
