/**
 * SDK Integration Tests
 * Tests real Daytona API operations
 *
 * These tests require:
 * - RUN_INTEGRATION_TESTS=true
 * - DAYTONA_API_KEY set
 *
 * Run with: RUN_INTEGRATION_TESTS=true bun test sdk-integration
 */

import {
	afterAll,
	beforeAll,
	describe,
	expect,
	test,
} from 'bun:test';
import { create_daytona_client } from '../../sandbox/client.js';
import { create_sandbox } from '../../sandbox/create.js';
import type { Sandbox } from '../../sandbox/sandbox.js';

const INTEGRATION = process.env.RUN_INTEGRATION_TESTS === 'true';
const TEST_SNAPSHOT = 'ralph-town-dev';
const TEST_LABEL = { 'test-run': 'sdk-integration' };

describe.skipIf(!INTEGRATION)('SDK Integration', () => {
	let test_sandbox: Sandbox | undefined;
	let sandbox_id: string | undefined;

	afterAll(async () => {
		if (test_sandbox) {
			try {
				await test_sandbox.delete(60);
			} catch {
				// Cleanup error - sandbox may already be deleted
			}
		}
	});

	test('create sandbox from snapshot', async () => {
		test_sandbox = await create_sandbox({
			snapshot: TEST_SNAPSHOT,
			labels: TEST_LABEL,
			timeout: 180,
		});

		expect(test_sandbox).toBeDefined();
		expect(test_sandbox.id).toBeTruthy();
		expect(typeof test_sandbox.id).toBe('string');

		sandbox_id = test_sandbox.id;
	}, 180_000);

	test('list sandboxes includes created one', async () => {
		expect(sandbox_id).toBeDefined();

		const daytona = create_daytona_client();
		const result = await daytona.list(undefined, 1, 100);

		const found = result.items.find((s) => s.id === sandbox_id);
		expect(found).toBeDefined();
		expect(found?.state).toBe('started');
	});

	test('get SSH credentials', async () => {
		expect(test_sandbox).toBeDefined();

		const ssh = await test_sandbox!.get_ssh_access(30);

		expect(ssh.token).toBeTruthy();
		expect(typeof ssh.token).toBe('string');
		expect(ssh.command).toContain('ssh');
		expect(ssh.expires_at).toBeInstanceOf(Date);
		expect(ssh.expires_at.getTime()).toBeGreaterThan(Date.now());
	});

	test('execute command in sandbox', async () => {
		expect(test_sandbox).toBeDefined();

		const result = await test_sandbox!.execute('git --version');

		expect(result.exit_code).toBe(0);
		expect(result.stdout).toContain('git version');
	});

	test('get working directory', async () => {
		expect(test_sandbox).toBeDefined();

		const work_dir = await test_sandbox!.get_work_dir();

		expect(work_dir).toBeTruthy();
		expect(typeof work_dir).toBe('string');
	});

	test('get home directory', async () => {
		expect(test_sandbox).toBeDefined();

		const home_dir = await test_sandbox!.get_home_dir();

		expect(home_dir).toBeTruthy();
		expect(typeof home_dir).toBe('string');
	});

	test('delete sandbox cleanup', async () => {
		expect(test_sandbox).toBeDefined();
		expect(sandbox_id).toBeDefined();

		await test_sandbox!.delete(60);

		// Verify sandbox is gone
		const daytona = create_daytona_client();
		const result = await daytona.list(undefined, 1, 100);
		const found = result.items.find((s) => s.id === sandbox_id);

		expect(found).toBeUndefined();

		// Clear so afterAll doesn't try to delete again
		test_sandbox = undefined;
	}, 90_000);
});

describe.skipIf(!INTEGRATION)('SDK Integration - Error Cases', () => {
	test('get non-existent sandbox throws', async () => {
		const daytona = create_daytona_client();
		const fake_id = 'non-existent-sandbox-id-12345';

		await expect(daytona.get(fake_id)).rejects.toThrow();
	});
});
