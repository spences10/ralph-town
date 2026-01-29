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
