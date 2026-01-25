/**
 * Daytona Runtime
 * Wraps Daytona SDK for cloud sandbox execution
 */

import { Daytona, Image } from '@daytonaio/sdk';
import { randomUUID } from 'crypto';
import type {
	ExecuteOptions,
	ExecuteResult,
	GitOperations,
	GitStatus,
	RuntimeEnvironment,
} from './types.js';

/**
 * Declarative image with pre-baked dependencies
 * Cached for 24 hours per Daytona runner
 */
const RALPH_IMAGE = Image.base('node:22-slim').dockerfileCommands([
	'RUN apt-get update && apt-get install -y git curl && rm -rf /var/lib/apt/lists/*',
	'RUN npm install -g tsx @anthropic-ai/claude-agent-sdk',
]);

type DaytonaSandbox = Awaited<ReturnType<Daytona['create']>>;

export class DaytonaRuntime implements RuntimeEnvironment {
	readonly type = 'daytona' as const;
	private _id: string;
	private daytona: Daytona;
	private sandbox: DaytonaSandbox | null = null;
	private workspace: string = '/home/daytona/workspace';
	private on_build_log?: (chunk: string) => void;

	constructor(opts?: { on_build_log?: (chunk: string) => void }) {
		this._id = `daytona-${randomUUID().slice(0, 8)}`;
		this.daytona = new Daytona();
		this.on_build_log = opts?.on_build_log;
	}

	get id(): string {
		return this.sandbox?.id || this._id;
	}

	get_workspace(): string {
		return this.workspace;
	}

	async initialize(): Promise<void> {
		this.sandbox = await this.daytona.create(
			{
				image: RALPH_IMAGE,
				language: 'typescript',
			},
			{
				timeout: 120,
				onSnapshotCreateLogs: this.on_build_log,
			},
		);

		// Verify node available
		const check = await this.execute('node --version');
		if (check.exit_code !== 0) {
			throw new Error('Node.js not available in sandbox');
		}
	}

	async cleanup(): Promise<void> {
		if (this.sandbox) {
			await this.daytona.delete(this.sandbox);
			this.sandbox = null;
		}
	}

	async execute(
		cmd: string,
		opts?: ExecuteOptions,
	): Promise<ExecuteResult> {
		if (!this.sandbox) {
			throw new Error('Sandbox not initialized');
		}

		const timeout_sec = opts?.timeout
			? Math.ceil(opts.timeout / 1000)
			: 120;

		try {
			const result = await this.sandbox.process.executeCommand(
				cmd,
				opts?.cwd,
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

	async write_file(
		path: string,
		content: Buffer | string,
	): Promise<void> {
		if (!this.sandbox) {
			throw new Error('Sandbox not initialized');
		}
		const buf =
			typeof content === 'string' ? Buffer.from(content) : content;
		await this.sandbox.fs.uploadFile(buf, path);
	}

	async read_file(path: string): Promise<Buffer> {
		if (!this.sandbox) {
			throw new Error('Sandbox not initialized');
		}
		const content = await this.sandbox.fs.downloadFile(path);
		return Buffer.from(content);
	}

	async file_exists(path: string): Promise<boolean> {
		const result = await this.execute(
			`test -f "${path}" && echo EXISTS`,
		);
		return result.stdout.trim() === 'EXISTS';
	}

	git: GitOperations = {
		clone: async (
			url: string,
			path: string,
			branch?: string,
			token?: string,
		) => {
			if (!this.sandbox) throw new Error('Sandbox not initialized');
			await this.sandbox.git.clone(
				url,
				path,
				branch || 'main',
				undefined,
				'git',
				token,
			);
			this.workspace = path;
		},

		checkout: async (branch: string, create?: boolean) => {
			if (!this.sandbox) throw new Error('Sandbox not initialized');
			if (create) {
				await this.sandbox.git.createBranch(this.workspace, branch);
			}
			await this.sandbox.git.checkoutBranch(this.workspace, branch);
		},

		add: async (files: string[]) => {
			if (!this.sandbox) throw new Error('Sandbox not initialized');
			await this.sandbox.git.add(this.workspace, files);
		},

		commit: async (
			message: string,
			author?: string,
			email?: string,
		) => {
			if (!this.sandbox) throw new Error('Sandbox not initialized');
			await this.sandbox.git.commit(
				this.workspace,
				message,
				author || 'Ralph Agent',
				email || 'ralph@example.com',
			);
		},

		push: async (branch: string, token?: string) => {
			if (!this.sandbox) throw new Error('Sandbox not initialized');
			await this.sandbox.git.push(this.workspace, 'git', token);
		},

		status: async (): Promise<GitStatus> => {
			if (!this.sandbox) throw new Error('Sandbox not initialized');
			const status = await this.sandbox.git.status(this.workspace);
			return {
				branch: status.currentBranch || 'main',
				files: (status.fileStatus || []).map((f) => ({
					name: f.name,
					status: f.extra || 'M',
				})),
				clean: !status.fileStatus || status.fileStatus.length === 0,
			};
		},

		create_worktree: async (branch: string): Promise<string> => {
			const worktree_path = `${this.workspace}/.worktrees/${branch}`;
			await this.execute(
				`mkdir -p "${this.workspace}/.worktrees" && git worktree add "${worktree_path}" -b "${branch}"`,
			);
			return worktree_path;
		},

		remove_worktree: async (path: string): Promise<void> => {
			await this.execute(`git worktree remove "${path}" --force`);
		},
	};

	/**
	 * Get preview link for sandbox
	 */
	async get_preview_link(port: number): Promise<string | null> {
		if (!this.sandbox) return null;
		try {
			const link = await this.sandbox.getPreviewLink(port);
			return link?.url || null;
		} catch {
			return null;
		}
	}
}
