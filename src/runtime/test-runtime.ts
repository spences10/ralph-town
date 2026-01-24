/**
 * Test script for runtime abstraction
 * Usage: bun src/runtime/test-runtime.ts [local|devcontainer]
 */

import 'dotenv/config';
import { create_runtime, validate_runtime_env } from './factory.js';
import type { RuntimeType } from './types.js';

async function main() {
	const runtime_type = (process.argv[2] || 'devcontainer') as RuntimeType;

	console.log(`\n=== Testing ${runtime_type} runtime ===\n`);

	// Validate env
	const missing = validate_runtime_env(runtime_type);
	if (missing.length > 0) {
		console.error(`Missing env vars: ${missing.join(', ')}`);
		process.exit(1);
	}

	// Create runtime
	const runtime = create_runtime({ type: runtime_type });
	console.log(`Runtime ID: ${runtime.id}`);

	try {
		// Initialize
		console.log('\n1. Initializing...');
		await runtime.initialize();
		console.log(`   Workspace: ${runtime.get_workspace()}`);

		// Test execute
		console.log('\n2. Testing execute...');
		const ls_result = await runtime.execute('ls -la');
		console.log(`   Exit code: ${ls_result.exit_code}`);
		console.log(`   Files: ${ls_result.stdout.split('\n').length - 1}`);

		// Test node/tsx
		console.log('\n3. Testing tsx...');
		const tsx_result = await runtime.execute('tsx --version');
		console.log(`   tsx: ${tsx_result.stdout.trim()}`);

		// Test bun
		console.log('\n4. Testing bun...');
		const bun_result = await runtime.execute('bun --version');
		console.log(`   bun: ${bun_result.stdout.trim()}`);

		// Test file operations
		console.log('\n5. Testing file ops...');
		const test_content = `// Test file created at ${new Date().toISOString()}`;
		await runtime.write_file(
			`${runtime.get_workspace()}/test-file.ts`,
			test_content,
		);
		const exists = await runtime.file_exists(
			`${runtime.get_workspace()}/test-file.ts`,
		);
		console.log(`   File exists: ${exists}`);

		// Test git status
		console.log('\n6. Testing git...');
		const status = await runtime.git.status();
		console.log(`   Branch: ${status.branch}`);
		console.log(`   Modified files: ${status.files.length}`);

		// Cleanup test file
		await runtime.execute(
			`rm -f ${runtime.get_workspace()}/test-file.ts`,
		);

		console.log('\n=== All tests passed! ===\n');
	} catch (error) {
		console.error('\nTest failed:', error);
		process.exit(1);
	} finally {
		// Cleanup
		console.log('Cleaning up...');
		await runtime.cleanup();
	}
}

main();
