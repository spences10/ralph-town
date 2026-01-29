/**
 * DevContainer Runtime
 * Spins up isolated containers dynamically, similar to Daytona
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, access, mkdir } from 'fs/promises';
import { randomUUID } from 'crypto';
import { quote } from 'shell-quote';
import type {
	RuntimeEnvironment,
	ExecuteOptions,
	ExecuteResult,
	GitOperations,
	GitStatus,
} from './types.js';

const exec_async = promisify(exec);

// Pre-built image with all dependencies
const CONTAINER_IMAGE = 'ralph-devcontainer:latest';

export class DevContainerRuntime implements RuntimeEnvironment {
	readonly type = 'devcontainer' as const;
	private _id: string;
	private container_id: string = '';
	private workspace: string = '/workspace';
	private host_workspace: string;

	constructor(host_workspace?: string) {
		this._id = `devcontainer-${randomUUID().slice(0, 8)}`;
		this.host_workspace = host_workspace || process.cwd();
	}

	get id(): string {
		return this._id;
	}

	get_workspace(): string {
		return this.workspace;
	}

	async initialize(): Promise<void> {
		// Check if image exists, build if not
		const { exit_code } = await this.run_local(
			`docker image inspect ${CONTAINER_IMAGE}`,
		);
		if (exit_code !== 0) {
			console.log('Building devcontainer image...');
			await this.build_image();
		}

		// Start container with workspace mount
		console.log('Starting devcontainer...');
		const { stdout } = await this.run_local(
			`docker run -d \
				--label devcontainer.ralph=${this._id} \
				-v "${this.host_workspace}:${this.workspace}" \
				-w ${this.workspace} \
				--env ANTHROPIC_API_KEY \
				--env GITHUB_PAT \
				${CONTAINER_IMAGE} \
				tail -f /dev/null`,
		);
		this.container_id = stdout.trim();

		if (!this.container_id) {
			throw new Error('Failed to start devcontainer');
		}

		// Verify responsive
		const test = await this.execute('echo ok');
		if (test.stdout.trim() !== 'ok') {
			throw new Error('DevContainer not responding');
		}

		console.log(`DevContainer started: ${this.container_id.slice(0, 12)}`);
	}

	private async build_image(): Promise<void> {
		const dockerfile = `
FROM node:22-slim
RUN apt-get update && apt-get install -y git curl && rm -rf /var/lib/apt/lists/*
RUN npm i -g bun tsx @anthropic-ai/claude-agent-sdk
WORKDIR /workspace
`;
		const result = await this.run_local(
			`docker build -t ${CONTAINER_IMAGE} -f - . <<'DOCKERFILE'
${dockerfile}
DOCKERFILE`,
		);
		if (result.exit_code !== 0) {
			throw new Error(`Failed to build image: ${result.stderr}`);
		}
	}

	private async run_local(cmd: string): Promise<ExecuteResult> {
		try {
			const { stdout, stderr } = await exec_async(cmd, {
				timeout: 300000,
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

	async cleanup(): Promise<void> {
		if (this.container_id) {
			console.log('Stopping devcontainer...');
			await this.run_local(`docker stop ${this.container_id}`);
			await this.run_local(`docker rm ${this.container_id}`);
		}
	}

	async execute(
		cmd: string,
		opts?: ExecuteOptions,
	): Promise<ExecuteResult> {
		const cwd = opts?.cwd || this.workspace;
		const timeout = opts?.timeout || 120000;

		// Build env string
		let env_str = '';
		if (opts?.env) {
			env_str = Object.entries(opts.env)
				.map(([k, v]) => `-e ${k}="${v}"`)
				.join(' ');
		}

		// Escape command for shell
		const escaped_cmd = cmd.replace(/"/g, '\\"');
		const docker_cmd = `docker exec ${env_str} -w "${cwd}" ${this.container_id} sh -c "${escaped_cmd}"`;

		try {
			const { stdout, stderr } = await exec_async(docker_cmd, {
				timeout,
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
		// Write via docker cp for container-only paths
		// or directly if mounted
		if (path.startsWith(this.workspace)) {
			const host_path = path.replace(
				this.workspace,
				this.host_workspace,
			);
			const dir = host_path.substring(0, host_path.lastIndexOf('/'));
			await mkdir(dir, { recursive: true });
			await writeFile(host_path, content);
		} else {
			// Write to temp file then copy in
			const tmp = `/tmp/ralph-${Date.now()}`;
			await writeFile(tmp, content);
			await this.run_local(
				`docker cp "${tmp}" "${this.container_id}:${path}"`,
			);
		}
	}

	async read_file(path: string): Promise<Buffer> {
		if (path.startsWith(this.workspace)) {
			const host_path = path.replace(
				this.workspace,
				this.host_workspace,
			);
			return readFile(host_path);
		} else {
			const { stdout } = await this.execute(`cat "${path}"`);
			return Buffer.from(stdout);
		}
	}

	async file_exists(path: string): Promise<boolean> {
		if (path.startsWith(this.workspace)) {
			const host_path = path.replace(
				this.workspace,
				this.host_workspace,
			);
			try {
				await access(host_path);
				return true;
			} catch {
				return false;
			}
		} else {
			const result = await this.execute(`test -f "${path}"`);
			return result.exit_code === 0;
		}
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
			const args = ['git', 'clone'];
			if (branch) args.push('-b', branch);
			args.push(auth_url, path);
			await this.execute(quote(args));
		},

		checkout: async (branch: string, create?: boolean) => {
			const args = ['git', 'checkout'];
			if (create) args.push('-b');
			args.push(branch);
			await this.execute(quote(args));
		},

		add: async (files: string[]) => {
			await this.execute(quote(['git', 'add', ...files]));
		},

		commit: async (message: string, author?: string, email?: string) => {
			const args =
				author && email
					? [
							'git',
							'-c',
							`user.name=${author}`,
							'-c',
							`user.email=${email}`,
							'commit',
							'-m',
							message,
						]
					: ['git', 'commit', '-m', message];
			await this.execute(quote(args));
		},

		push: async (branch: string, _token?: string) => {
			await this.execute(
				quote(['git', 'push', '-u', 'origin', branch]),
			);
		},

		status: async (): Promise<GitStatus> => {
			const result = await this.execute(
				'git status --porcelain && echo "---BRANCH---" && git branch --show-current',
			);
			const parts = result.stdout.split('---BRANCH---');
			const files_part = parts[0] || '';
			const branch = (parts[1] || 'main').trim();
			const files = files_part
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
			const worktrees_dir = `${this.workspace}/.worktrees`;
			const worktree_path = `${worktrees_dir}/${branch}`;
			await this.execute(quote(['mkdir', '-p', worktrees_dir]));
			await this.execute(
				quote([
					'git',
					'worktree',
					'add',
					worktree_path,
					'-b',
					branch,
				]),
			);
			return worktree_path;
		},

		remove_worktree: async (path: string): Promise<void> => {
			await this.execute(
				quote(['git', 'worktree', 'remove', path, '--force']),
			);
		},
	};
}
