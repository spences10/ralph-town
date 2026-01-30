/**
 * Sandbox Class
 * Wraps a Daytona sandbox with convenient methods
 */

import type { Sandbox as DaytonaSandbox } from '@daytonaio/sdk';
import type { Daytona } from '@daytonaio/sdk';
import type { ExecuteResult, SshAccess } from './types.js';

/** Default SSH access expiration in minutes */
const DEFAULT_SSH_EXPIRES_MINUTES = 60;

/** Default command timeout in seconds */
const DEFAULT_COMMAND_TIMEOUT = 120;

/**
 * Sandbox instance wrapper
 * Provides convenient methods for interacting with a Daytona sandbox
 */
export class Sandbox {
	private readonly daytona: Daytona;
	private readonly sandbox: DaytonaSandbox;

	constructor(daytona: Daytona, sandbox: DaytonaSandbox) {
		this.daytona = daytona;
		this.sandbox = sandbox;
	}

	/**
	 * Get the sandbox ID
	 */
	get id(): string {
		return this.sandbox.id;
	}

	/**
	 * Get the sandbox state
	 */
	get state(): string | undefined {
		return this.sandbox.state;
	}

	/**
	 * Get SSH access credentials
	 * @param expires_minutes - How long the access should be valid (default: 60)
	 * @returns SSH access token and command
	 */
	async get_ssh_access(
		expires_minutes: number = DEFAULT_SSH_EXPIRES_MINUTES,
	): Promise<SshAccess> {
		const access = await this.sandbox.createSshAccess(expires_minutes);
		return {
			token: access.token,
			command: access.sshCommand,
			expires_at: new Date(access.expiresAt),
		};
	}

	/**
	 * Execute a command in the sandbox
	 * @param cmd - Command to execute
	 * @param cwd - Working directory (optional)
	 * @param timeout_sec - Timeout in seconds (default: 120)
	 * @returns Execution result with stdout, stderr, and exit code
	 */
	async execute(
		cmd: string,
		cwd?: string,
		timeout_sec: number = DEFAULT_COMMAND_TIMEOUT,
	): Promise<ExecuteResult> {
		try {
			const result = await this.sandbox.process.executeCommand(
				cmd,
				cwd,
				undefined,
				timeout_sec,
			);
			return {
				stdout: result.result,
				stderr: '',
				exit_code: result.exitCode,
			};
		} catch (error) {
			return {
				stdout: '',
				stderr: String(error),
				exit_code: 1,
			};
		}
	}

	/**
	 * Upload a file to the sandbox
	 * @param path - Destination path in the sandbox
	 * @param content - File content as string or Buffer
	 */
	async upload_file(
		path: string,
		content: string | Buffer,
	): Promise<void> {
		const buf =
			typeof content === 'string' ? Buffer.from(content) : content;
		await this.sandbox.fs.uploadFile(buf, path);
	}

	/**
	 * Download a file from the sandbox
	 * @param path - Path to the file in the sandbox
	 * @returns File content as Buffer
	 */
	async download_file(path: string): Promise<Buffer> {
		const content = await this.sandbox.fs.downloadFile(path);
		return Buffer.from(content);
	}

	/**
	 * Delete the sandbox
