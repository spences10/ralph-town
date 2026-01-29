/**
 * Local Runtime
 * Executes commands directly on the host via child_process
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
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

const exec_async = promisify(exec);

/**
 * Execute command with array args (safe from injection)
 */
async function spawn_async(
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

		proc.stdout?.on('data', (data) => {
			stdout += data.toString();
		});
		proc.stderr?.on('data', (data) => {
			stderr += data.toString();
		});

		proc.on('close', (code) => {
			resolve({ stdout, stderr, exit_code: code ?? 0 });
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

		try {
			const { stdout, stderr } = await exec_async(cmd, {
				cwd,
				timeout,
				env: { ...process.env, ...opts?.env },
				maxBuffer: 10 * 1024 * 1024,
			});
			return { stdout, stderr, exit_code: 0 };
		} catch (error: unknown) {
			const err = error as {
				stdout?: string;
				stderr?: string;
				code?: number;
			};
			return {
				stdout: err.stdout || '',
				stderr: err.stderr || String(error),
				exit_code: err.code || 1,
			};
		}
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

	git: GitOperations = {
		clone: async (
			url: string,
			path: string,
			branch?: string,
			token?: string,
		) => {
			const args = ['clone'];
			if (branch) args.push('-b', branch);
			args.push(url, path);

			if (token && url.includes('github.com')) {
				// Use GIT_ASKPASS to avoid token in process list
				const askpass_script = join(this.workspace, '.git-askpass.sh');
				await this.write_file(
					askpass_script,
					`#!/bin/sh\necho "${token}"`,
				);
				await this.execute(`chmod +x "${askpass_script}"`);

				try {
					await spawn_async('git', args, {
						cwd: this.workspace,
						env: {
							GIT_ASKPASS: askpass_script,
							GIT_TERMINAL_PROMPT: '0',
						},
					});
				} finally {
					// Clean up askpass script
					await this.execute(`rm -f "${askpass_script}"`);
				}
			} else {
				await spawn_async('git', args, { cwd: this.workspace });
			}
		},

		checkout: async (branch: string, create?: boolean) => {
			const args = ['checkout'];
			if (create) args.push('-b');
			args.push(branch);
			await spawn_async('git', args, { cwd: this.workspace });
		},

		add: async (files: string[]) => {
			await spawn_async('git', ['add', ...files], { cwd: this.workspace });
		},

		commit: async (message: string, author?: string, email?: string) => {
			const args = author && email
				? ['-c', `user.name=${author}`, '-c', `user.email=${email}`, 'commit', '-m', message]
				: ['commit', '-m', message];
			await spawn_async('git', args, { cwd: this.workspace });
		},

		push: async (branch: string, _token?: string) => {
			await spawn_async('git', ['push', '-u', 'origin', branch], {
				cwd: this.workspace,
			});
		},

		status: async (): Promise<GitStatus> => {
			const result = await this.execute(
				'git status --porcelain && git branch --show-current',
			);
			const lines = result.stdout.trim().split('\n');
			const branch = lines.pop() || 'main';
			const files = lines
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
			await spawn_async(
				'git',
				['worktree', 'add', worktree_path, '-b', branch],
				{ cwd: this.workspace },
			);
			return worktree_path;
		},

		remove_worktree: async (path: string): Promise<void> => {
			await spawn_async('git', ['worktree', 'remove', path, '--force'], {
				cwd: this.workspace,
			});
		},
	};
}
