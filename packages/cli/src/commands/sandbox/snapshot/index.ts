/**
 * sandbox snapshot command group
 * Snapshot management commands
 */

import { defineCommand } from 'citty';
import create from './create.js';

export default defineCommand({
	meta: {
		name: 'snapshot',
		description: 'Manage Daytona snapshots',
	},
	subCommands: {
		create,
	},
});
