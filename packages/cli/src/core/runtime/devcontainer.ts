/**
 * DevContainer Runtime
 * Spins up isolated containers dynamically, similar to Daytona
 */

import { spawn } from 'child_process';
import { writeFile, readFile, access, mkdir } from 'fs/promises';
import { randomUUID } from 'crypto';
import type {
	RuntimeEnvironment,
	ExecuteOptions,
	ExecuteResult,
	GitOperations,
	GitStatus,
} from './types.js';

// Pre-built image with all dependencies
const CONTAINER_IMAGE = 'ralph-devcontainer:latest';

/**
 * Execute command with array args (safe from injection)
 */
async function spawn_cmd(
	cmd: string,
	args: string[],
	opts?: { timeout?: number },
): Promise<ExecuteResult> {
	return new Promise((resolve) => {
		const proc = spawn(cmd, args, {
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
		const { exit_code } = await this.run_local_spawn('docker', [
			'image',
			'inspect',
			CONTAINER_IMAGE,
		]);
		if (exit_code !== 0) {
			console.log('Building devcontainer image...');
			await this.build_image();
		}

		// Start container with workspace mount
		console.log('Starting devcontainer...');
		const { stdout } = await this.run_local_spawn('docker', [
			'run',
			'-d',
			'--label',
			`devcontainer.ralph=${this._id}`,
			'-v',
			`${this.host_workspace}:${this.workspace}`,
			'-w',
			this.workspace,
			'--env',
			'ANTHROPIC_API_KEY',
			'--env',
			'GITHUB_PAT',
			CONTAINER_IMAGE,
			'tail',
			'-f',
			'/dev/null',
		]);
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
		// Write dockerfile to temp, then build
		const tmp_dockerfile = `/tmp/ralph-dockerfile-${Date.now()}`;
		await writeFile(tmp_dockerfile, dockerfile);

		const result = await this.run_local_spawn('docker', [
			'build',
			'-t',
			CONTAINER_IMAGE,
			'-f',
			tmp_dockerfile,
			'.',
		]);
		if (result.exit_code !== 0) {
			throw new Error(`Failed to build image: ${result.stderr}`);
		}
	}

	private async run_local_spawn(
		cmd: string,
		args: string[],
	): Promise<ExecuteResult> {
		return spawn_cmd(cmd, args, { timeout: 300000 });
	}

	async cleanup(): Promise<void> {
		if (this.container_id) {
			console.log('Stopping devcontainer...');
			await this.run_local_spawn('docker', ['stop', this.container_id]);
			await this.run_local_spawn('docker', ['rm', this.container_id]);
		}
	}

	async execute(
		cmd: string,
		opts?: ExecuteOptions,
	): Promise<ExecuteResult> {
		const cwd = opts?.cwd || this.workspace;
		const timeout = opts?.timeout || 120000;

		// Build docker exec args safely
		const args = ['exec'];

		if (opts?.env) {
			for (const [k, v] of Object.entries(opts.env)) {
				args.push('-e', `${k}=${v}`);
			}
		}

		args.push('-w', cwd, this.container_id, 'sh', '-c', cmd);

		return spawn_cmd('docker', args, { timeout });
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
			await this.run_local_spawn('docker', [
				'cp',
				tmp,
				`${this.container_id}:${path}`,
			]);
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

	/**
	 * Execute git via docker exec with array args (injection-safe)
	 */
	private async docker_git(args: string[]): Promise<ExecuteResult> {
		return spawn_cmd(
			'docker',
			['exec', '-w', this.workspace, this.container_id, 'git', ...args],
			{ timeout: 120000 },
		);
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
			await this.docker_git(args);
		},

		checkout: async (branch: string, create?: boolean) => {
			const args = ['checkout'];
			if (create) {
				args.push('-b');
			}
			args.push(branch);
			await this.docker_git(args);
		},

		add: async (files: string[]) => {
			await this.docker_git(['add', ...files]);
		},

		commit: async (message: string, author?: string, email?: string) => {
			const args = [];
			if (author && email) {
				args.push('-c', `user.name=${author}`, '-c', `user.email=${email}`);
			}
			args.push('commit', '-m', message);
			await this.docker_git(args);
		},

		push: async (branch: string, _token?: string) => {
			await this.docker_git(['push', '-u', 'origin', branch]);
		},

		status: async (): Promise<GitStatus> => {
			const porcelain = await this.docker_git(['status', '--porcelain']);
			const branch_result = await this.docker_git([
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
			// Create parent dir first
			await spawn_cmd(
				'docker',
				[
					'exec',
					this.container_id,
					'mkdir',
					'-p',
					`${this.workspace}/.worktrees`,
				],
				{ timeout: 10000 },
			);
			await this.docker_git(['worktree', 'add', worktree_path, '-b', branch]);
			return worktree_path;
		},

		remove_worktree: async (path: string): Promise<void> => {
			await this.docker_git(['worktree', 'remove', path, '--force']);
		},
	};
}
