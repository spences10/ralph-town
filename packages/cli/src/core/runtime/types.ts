/**
 * Runtime abstraction types
 * Enables working with Daytona, local, or devcontainer environments
 */

export interface ExecuteOptions {
	cwd?: string;
	timeout?: number; // ms, default 120000
	env?: Record<string, string>;
}

export interface ExecuteResult {
	stdout: string;
	stderr: string;
	exit_code: number;
}

export interface GitStatus {
	branch: string;
	files: Array<{ name: string; status: string }>;
	clean: boolean;
}

export interface GitOperations {
	clone(
		url: string,
		path: string,
		branch?: string,
		token?: string,
	): Promise<void>;
	checkout(branch: string, create?: boolean): Promise<void>;
	add(files: string[]): Promise<void>;
	commit(message: string, author?: string, email?: string): Promise<void>;
	push(branch: string, token?: string): Promise<void>;
	status(): Promise<GitStatus>;
	create_worktree?(branch: string): Promise<string>;
	remove_worktree?(path: string): Promise<void>;
}

/**
 * Runtime environment interface
 * All execution environments must implement this
 */
export interface RuntimeEnvironment {
	readonly id: string;
	readonly type: 'daytona' | 'local' | 'devcontainer';

	// Lifecycle
	initialize(): Promise<void>;
	cleanup(): Promise<void>;

	// Execution
	execute(cmd: string, opts?: ExecuteOptions): Promise<ExecuteResult>;

	// Filesystem
	write_file(path: string, content: Buffer | string): Promise<void>;
	read_file(path: string): Promise<Buffer>;
	file_exists(path: string): Promise<boolean>;

	// Git operations
	git: GitOperations;

	// Working directory for this runtime
	get_workspace(): string;
}

export type RuntimeType = 'daytona' | 'local' | 'devcontainer';
