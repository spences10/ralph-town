/**
 * Local Runtime
 * Executes commands directly on the host via child_process
 */

import { exec } from 'child_process';
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
			const branch_flag = branch ? `-b ${branch}` : '';
			if (token && url.includes('github.com')) {
				// Use GIT_ASKPASS to avoid exposing token in command/logs
				const askpass_script = `#!/bin/sh\necho ${token}`;
				const askpass_path = join(tmpdir(), `git-askpass-${randomUUID().slice(0, 8)}`);
				await writeFile(askpass_path, askpass_script, { mode: 0o700 });
				try {
					await this.execute(`git clone ${branch_flag} ${url} ${path}`, {
						env: {
							GIT_ASKPASS: askpass_path,
							GIT_TERMINAL_PROMPT: '0',
						},
					});
				} finally {
					await rm(askpass_path, { force: true });
				}
			} else {
				await this.execute(`git clone ${branch_flag} ${url} ${path}`);
			}
		},

		checkout: async (branch: string, create?: boolean) => {
			const flag = create ? '-b' : '';
			await this.execute(`git checkout ${flag} ${branch}`);
		},

		add: async (files: string[]) => {
			await this.execute(`git add ${files.join(' ')}`);
		},

		commit: async (message: string, author?: string, email?: string) => {
			if (author && email) {
				await this.execute(
					`git -c user.name=${author} -c user.email=${email} commit -m ${message}`,
				);
			} else {
				await this.execute(`git commit -m ${message}`);
			}
		},

		push: async (branch: string, _token?: string) => {
			await this.execute(`git push -u origin ${branch}`);
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
			await this.execute(
				`git worktree add ${worktree_path} -b ${branch}`,
			);
			return worktree_path;
		},

		remove_worktree: async (path: string): Promise<void> => {
			await this.execute(`git worktree remove ${path} --force`);
		},
	};
}
