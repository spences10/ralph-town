/**
 * sandbox command group
 * Daytona sandbox management commands
 */

import { defineCommand } from 'citty';
import create from './create.js';
import del from './delete.js';
import env from './env.js';
import exec from './exec.js';
import health from './health.js';
import list from './list.js';
import preflight from './preflight.js';
import snapshot from './snapshot/index.js';
import ssh from './ssh.js';

export default defineCommand({
	meta: {
		name: 'sandbox',
		description: 'Manage Daytona sandboxes',
	},
	subCommands: {
		create,
		ssh,
		list,
		delete: del,
		exec,
		preflight,
		snapshot,
		env,
		health,
	},
});
