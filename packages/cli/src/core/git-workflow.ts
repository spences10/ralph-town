/**
 * Git Workflow Operations
 * Handles repository setup, commits, and PR creation
 */

import { spawn } from 'child_process';
import type { RuntimeEnvironment } from './runtime/types.js';
import type { GitConfig, RepositoryConfig } from './types.js';
import { GREEN, RESET, print_error, print_message } from './utils.js';

/**
 * Execute command with array args (safe from injection)
 */
function spawn_async(
	cmd: string,
	args: string[],
): Promise<{ stdout: string; stderr: string; exit_code: number }> {
	return new Promise((resolve) => {
		const proc = spawn(cmd, args, { timeout: 120000 });
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

/**
 * Set up git repository in runtime
 * Clone repo and create feature branch
 */
export async function setup_git(
	runtime: RuntimeEnvironment,
	repo: RepositoryConfig,
	git: GitConfig,
): Promise<string> {
	const github_pat = process.env.GITHUB_PAT;
	if (!github_pat) {
		throw new Error(
			'GITHUB_PAT environment variable required for git workflow',
		);
	}

	const branch = repo.branch || 'main';
	const repo_path = runtime.get_workspace();

	print_message('system', `Cloning ${repo.url} (${branch})...`);

	// Clone repository
	await runtime.git.clone(repo.url, repo_path, branch, github_pat);

	print_message('system', `Creating branch: ${git.feature_branch}`);

	// Create and checkout feature branch
	await runtime.git.checkout(git.feature_branch, true);

	// Configure git user for commits
	const author = git.commit_author || 'Ralph Agent';
	const email = git.commit_email || 'ralph@example.com';
	await runtime.execute(
		'git config user.name ' + JSON.stringify(author),
		{ cwd: repo_path },
	);
	await runtime.execute(
		'git config user.email ' + JSON.stringify(email),
		{ cwd: repo_path },
	);

	// Pre-install deps if package.json exists
	await install_dependencies(runtime, repo_path);

	print_message('system', `Git ready: ${git.feature_branch}`);

	// Return working directory
	return repo.working_dir
		? `${repo_path}/${repo.working_dir}`
		: repo_path;
}

/**
 * Install project dependencies
 */
async function install_dependencies(
	runtime: RuntimeEnvironment,
	repo_path: string,
): Promise<void> {
	// Detect package manager from lockfile
	const lockfile_check = await runtime.execute(
		`cd ${repo_path} && if [ -f pnpm-lock.yaml ]; then echo "pnpm"; elif [ -f bun.lockb ] || [ -f bun.lock ]; then echo "bun"; elif [ -f yarn.lock ]; then echo "yarn"; elif [ -f package-lock.json ]; then echo "npm"; elif [ -f package.json ]; then echo "npm"; fi`,
	);
	const pkg_manager = lockfile_check.stdout.trim();

	if (!pkg_manager) return;

	// Install package manager on-demand if not npm
	if (pkg_manager === 'pnpm') {
		print_message('system', 'Installing pnpm...');
		await runtime.execute('npm install -g pnpm', { timeout: 60000 });
	} else if (pkg_manager === 'yarn') {
		print_message('system', 'Installing yarn...');
		await runtime.execute('npm install -g yarn', { timeout: 60000 });
	}

	print_message(
		'system',
		`Installing dependencies (${pkg_manager})...`,
	);
	const result = await runtime.execute(
		`cd ${repo_path} && ${pkg_manager} install`,
		{
			timeout: 120000,
		},
	);

	if (result.exit_code === 0) {
		print_message('system', 'Dependencies installed');
	} else {
		print_message(
			'system',
			`Warning: ${pkg_manager} install failed (agent may retry)`,
		);
	}
}

/**
 * Finalize git changes
 * Stage, commit, and push changes
 */
export async function finalize_git(
	runtime: RuntimeEnvironment,
	git: GitConfig,
	task: string,
): Promise<void> {
	const github_pat = process.env.GITHUB_PAT;
	if (!github_pat) {
		throw new Error('GITHUB_PAT required for git push');
	}

	// Check if there are changes to commit
	const status = await runtime.git.status();

	if (status.clean) {
		print_message('system', 'No changes to commit');
		return;
	}

	print_message('system', 'Staging changes...');

	// Stage all changed files except progress.txt (runtime state, not code)
	const files_to_add = status.files
		.map((f) => f.name)
		.filter((f) => !f.endsWith('progress.txt'));

	if (files_to_add.length === 0) {
		print_message('system', 'No code changes to commit (only progress.txt)');
		return;
	}

	await runtime.git.add(files_to_add);

	// Generate commit message
	const message = git.commit_message || `feat: ${task.slice(0, 50)}`;
	const author = git.commit_author || 'Ralph Agent';
	const email = git.commit_email || 'ralph@example.com';

	print_message('system', `Committing: ${message}`);

	await runtime.git.commit(message, author, email);

	print_message('system', `Pushing to ${git.feature_branch}...`);

	await runtime.git.push(git.feature_branch, github_pat);

	print_message(
		'system',
		`${GREEN}Pushed to ${git.feature_branch}${RESET}`,
	);
}

/**
 * Create a pull request using local gh CLI
 */
export async function create_pull_request(
	repo: RepositoryConfig,
	git: GitConfig,
	task: string,
): Promise<string | null> {
	if (!git.create_pr) {
		return null;
	}

	const title = git.pr_title || `feat: ${task.slice(0, 50)}`;
	const body =
		git.pr_body ||
		`## Summary\n\nAutomated by Ralph Loop.\n\n**Task:** ${task}`;

	// Extract owner/repo from URL
	const match = repo.url.match(/github\.com[:/](.+?)(?:\.git)?$/);
	if (!match) {
		print_error('Could not parse repo URL for PR creation');
		return null;
	}
	const repo_path = match[1];

	print_message('system', `Creating PR: ${title}`);

	try {
		const result = await spawn_async('gh', [
			'pr',
			'create',
			'--repo',
			repo_path,
			'--head',
			git.feature_branch,
			'--title',
			title,
			'--body',
			body,
		]);
		if (result.exit_code !== 0) {
			throw new Error(result.stderr || 'gh pr create failed');
		}
		const pr_url = result.stdout.trim();
		print_message('system', `${GREEN}PR created: ${pr_url}${RESET}`);
		return pr_url;
	} catch (error) {
		const err_msg =
			error instanceof Error ? error.message : String(error);
		print_error(`Failed to create PR: ${err_msg}`);
		return null;
	}
}
