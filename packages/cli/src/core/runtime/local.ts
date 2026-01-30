/**
 * Local Runtime
 * Executes commands directly on the host via child_process
 */

import { spawn } from 'child_process';
import { readFile, writeFile, access, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type {
	RuntimeEnvironment,
	ExecuteOptions,
	ExecuteResult,
	GitOperations,
	GitStatus,
} from './types.js';

/**
 * Execute command with array args (safe from injection)
 */
async function spawn_cmd(
	cmd: string,
	args: string[],
	opts?: { cwd?: string; env?: Record<string, string>; timeout?: number },
): Promise<ExecuteResult> {
	return new Promise((resolve) => {
		const proc = spawn(cmd, args, {
			cwd: opts?.cwd,
			env: { ...process.env, ...opts?.env },
			timeout: opts?.timeout || 120000,
		});

		let stdout = '';
		let stderr = '';

		proc.stdout?.on('data', (data) => (stdout += data));
		proc.stderr?.on('data', (data) => (stderr += data));

		proc.on('close', (code) => {
			resolve({ stdout, stderr, exit_code: code || 0 });
		});

		proc.on('error', (err) => {
			resolve({ stdout, stderr: err.message, exit_code: 1 });
		});
	});
}

export class LocalRuntime implements RuntimeEnvironment {
	readonly type = 'local' as const;
	private _id: string;
	private workspace: string;
	private temp_dir: string | null = null;
	private use_temp: boolean;

	constructor(workspace?: string) {
		this._id = `local-${randomUUID().slice(0, 8)}`;
		this.workspace = workspace || process.cwd();
		this.use_temp = !workspace;
	}

	get id(): string {
		return this._id;
	}

	get_workspace(): string {
		return this.workspace;
	}

	async initialize(): Promise<void> {
		if (this.use_temp) {
			this.temp_dir = await mkdtemp(join(tmpdir(), 'ralph-'));
			this.workspace = this.temp_dir;
		}
	}

	async cleanup(): Promise<void> {
		if (this.temp_dir) {
			await rm(this.temp_dir, { recursive: true, force: true });
		}
	}

	async execute(
		cmd: string,
		opts?: ExecuteOptions,
	): Promise<ExecuteResult> {
		const cwd = opts?.cwd || this.workspace;
		const timeout = opts?.timeout || 120000;

		// For backwards compat, parse simple commands
		// But git operations should use spawn_git directly
		return spawn_cmd('sh', ['-c', cmd], { cwd, env: opts?.env, timeout });
	}

	async write_file(path: string, content: Buffer | string): Promise<void> {
		await writeFile(path, content);
	}

	async read_file(path: string): Promise<Buffer> {
		return readFile(path);
	}

	async file_exists(path: string): Promise<boolean> {
		try {
			await access(path);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Spawn git with array args (injection-safe)
	 */
	private async spawn_git(
		args: string[],
		cwd?: string,
	): Promise<ExecuteResult> {
		return spawn_cmd('git', args, { cwd: cwd || this.workspace });
	}

	git: GitOperations = {
		clone: async (
			url: string,
			path: string,
			branch?: string,
			token?: string,
		) => {
			let auth_url = url;
			if (token && url.includes('github.com')) {
				auth_url = url.replace(
					'https://github.com',
					`https://git:${token}@github.com`,
				);
			}
			const args = ['clone'];
			if (branch) {
				args.push('-b', branch);
			}
			args.push(auth_url, path);
			await this.spawn_git(args);
		},

		checkout: async (branch: string, create?: boolean) => {
			const args = ['checkout'];
			if (create) {
				args.push('-b');
			}
			args.push(branch);
			await this.spawn_git(args);
		},

		add: async (files: string[]) => {
			await this.spawn_git(['add', ...files]);
		},

		commit: async (message: string, author?: string, email?: string) => {
			const args = [];
			if (author && email) {
				args.push('-c', `user.name=${author}`, '-c', `user.email=${email}`);
			}
			args.push('commit', '-m', message);
			await this.spawn_git(args);
		},

		push: async (branch: string, _token?: string) => {
			await this.spawn_git(['push', '-u', 'origin', branch]);
		},

		status: async (): Promise<GitStatus> => {
			const porcelain = await this.spawn_git(['status', '--porcelain']);
			const branch_result = await this.spawn_git([
				'branch',
				'--show-current',
			]);
			const branch = branch_result.stdout.trim() || 'main';
			const files = porcelain.stdout
				.trim()
				.split('\n')
				.filter((l) => l.trim())
				.map((l) => ({
					name: l.slice(3),
					status: l.slice(0, 2).trim(),
				}));
			return {
				branch,
				files,
				clean: files.length === 0,
			};
		},

		create_worktree: async (branch: string): Promise<string> => {
			const worktree_path = `${this.workspace}/.worktrees/${branch}`;
			await this.spawn_git(['worktree', 'add', worktree_path, '-b', branch]);
			return worktree_path;
		},

		remove_worktree: async (path: string): Promise<void> => {
			await this.spawn_git(['worktree', 'remove', path, '--force']);
		},
	};
}
