/**
 * Tests for mock factories
 */

import { describe, expect, test } from 'bun:test';
import {
	create_mock_daytona,
	create_mock_raw_sandbox,
	create_mock_sandbox,
} from './daytona';

describe('create_mock_sandbox', () => {
	test('returns sandbox with default values', () => {
		const sandbox = create_mock_sandbox();
		expect(sandbox.id).toBe('mock-sandbox-123');
		expect(sandbox.state).toBe('started');
	});

	test('accepts custom id and state', () => {
		const sandbox = create_mock_sandbox({
			id: 'custom-id',
			state: 'stopped',
		});
		expect(sandbox.id).toBe('custom-id');
		expect(sandbox.state).toBe('stopped');
	});

	test('get_ssh_access returns mock credentials', async () => {
		const sandbox = create_mock_sandbox();
		const access = await sandbox.get_ssh_access();
		expect(access.token).toBe('mock-ssh-token');
		expect(access.command).toContain('ssh');
	});

	test('execute returns default result', async () => {
		const sandbox = create_mock_sandbox();
		const result = await sandbox.execute('ls');
		expect(result.exit_code).toBe(0);
	});

	test('methods are spied', () => {
		const sandbox = create_mock_sandbox();
		sandbox.execute('ls');
		expect(sandbox.execute).toHaveBeenCalledWith('ls');
	});
});

describe('create_mock_daytona', () => {
	test('returns client with mock methods', () => {
		const client = create_mock_daytona();
		expect(client.create).toBeDefined();
		expect(client.get).toBeDefined();
		expect(client.list).toBeDefined();
		expect(client.delete).toBeDefined();
	});

	test('create returns provided sandbox', async () => {
		const sandbox = create_mock_sandbox({ id: 'my-sandbox' });
		const client = create_mock_daytona(sandbox);
		const result = await client.create({});
		expect(result.id).toBe('my-sandbox');
	});

	test('list returns sandbox summary', async () => {
		const client = create_mock_daytona();
		const list = await client.list();
		expect(list).toHaveLength(1);
		expect(list[0].id).toBe('mock-sandbox-123');
	});
});

describe('create_mock_raw_sandbox', () => {
	test('returns SDK-compatible object', () => {
		const raw = create_mock_raw_sandbox();
		expect(raw.id).toBe('mock-sandbox-123');
		expect(raw.process.executeCommand).toBeDefined();
		expect(raw.fs.uploadFile).toBeDefined();
	});

	test('createSshAccess returns SDK format', async () => {
		const raw = create_mock_raw_sandbox();
		const access = await raw.createSshAccess();
		expect(access.token).toBe('mock-ssh-token');
		expect(access.sshCommand).toContain('ssh');
		expect(access.expiresAt).toBeDefined();
	});
});
