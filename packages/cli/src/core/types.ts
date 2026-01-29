/**
 * Ralph-Town type definitions
 */

// Repository configuration for git workflow
export interface RepositoryConfig {
	url: string;
	branch?: string; // default: 'main'
	working_dir?: string; // subdirectory to work in
}

// Git workflow configuration
export interface GitConfig {
	feature_branch: string; // e.g., 'feature/agent-123'
	commit_author?: string; // default: 'Agent'
	commit_email?: string; // default: 'agent@example.com'
	commit_message?: string; // default: auto-generated
	create_pr?: boolean; // default: false
	pr_title?: string;
	pr_body?: string;
}

// Runtime type
export type RuntimeType = 'daytona' | 'local' | 'devcontainer';
