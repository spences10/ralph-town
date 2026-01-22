/**
 * Ralph-GAS type definitions
 */

// Acceptance criteria types (legacy single-task mode)
export type AcceptanceCriterion =
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

// Feature list pattern (multi-task mode)
export interface Feature {
	id: string;
	description: string;
	task: string;
	backpressure: string; // command to verify completion
	passes: boolean;
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

// Ralph configuration
export interface RalphConfig {
	// Single task mode (legacy)
	task?: string;
	acceptance_criteria?: AcceptanceCriterion[];
	max_iterations?: number;

	// Feature list mode (recommended)
	features?: Feature[];
	max_iterations_per_feature?: number;

	// Git workflow
	repository?: RepositoryConfig;
	git?: GitConfig;

	// Budget
	budget: {
		max_tokens: number;
		max_cost_usd?: number;
	};
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
}
