/**
 * Sandbox Module Types
 * Type definitions for Daytona sandbox operations
 */

import type { Image } from '@daytonaio/sdk';

/**
 * Options for creating a sandbox
 */
export interface CreateSandboxOptions {
	/** Sandbox name */
	name?: string;
	/** Snapshot name to use (skips image building) */
	snapshot?: string;
	/** Docker image name or Daytona Image object */
	image?: string | Image;
	/** Additional dockerfile commands to run */
	dockerfile_commands?: string[];
	/** Environment variables to set */
	env_vars?: Record<string, string>;
	/** Custom labels for the sandbox */
	labels?: Record<string, string>;
	/** Auto-stop interval in minutes (0 to disable) */
	auto_stop_interval?: number;
	/** Timeout in seconds for sandbox creation */
	timeout?: number;
	/** Callback for build logs */
	on_build_log?: (chunk: string) => void;
}

/**
 * SSH access credentials and command
 */
export interface SshAccess {
	/** SSH access token */
	token: string;
	/** Full SSH command to connect */
	command: string;
	/** When the access expires */
	expires_at: Date;
}

/**
 * Result of command execution
 */
export interface ExecuteResult {
	/** Standard output */
	stdout: string;
	/** Standard error */
	stderr: string;
	/** Exit code */
	exit_code: number;
}

/**
 * Summary of a sandbox for list operations
 */
export interface SandboxSummary {
	/** Sandbox ID */
	id: string;
	/** Current state (e.g., 'started', 'stopped') */
	state: string;
}

/**
 * Interface for sandbox instance operations
 */
export interface ISandbox {
	/** Sandbox ID */
	readonly id: string;
	/** Current state */
	readonly state: string | undefined;
	/** Get SSH access credentials */
	get_ssh_access(expires_minutes?: number): Promise<SshAccess>;
	/** Execute a command in the sandbox */
	execute(
		cmd: string,
		cwd?: string,
		timeout_sec?: number,
	): Promise<ExecuteResult>;
	/** Upload a file to the sandbox */
	upload_file(path: string, content: string | Buffer): Promise<void>;
	/** Download a file from the sandbox */
	download_file(path: string): Promise<Buffer>;
	/** Delete the sandbox */
	delete(timeout?: number): Promise<void>;
	/** Get the working directory path */
	get_work_dir(): Promise<string | undefined>;
	/** Get the user's home directory path */
	get_home_dir(): Promise<string | undefined>;
}

/**
 * Provider interface for sandbox operations
 * Abstracts the underlying sandbox service for future flexibility
 */
export interface SandboxProvider {
	/** Create a new sandbox */
	create(options: CreateSandboxOptions): Promise<ISandbox>;
	/** Delete a sandbox by ID */
	delete(id: string): Promise<void>;
	/** List sandboxes with optional limit */
	list(limit?: number): Promise<SandboxSummary[]>;
	/** Get a sandbox by ID */
	get(id: string): Promise<ISandbox>;
}
