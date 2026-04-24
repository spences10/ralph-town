#!/usr/bin/env node
/**
 * Ralph CLI
 * Command-line interface for disposable Daytona sandboxes
 */

import { defineCommand, runCommand, runMain } from 'citty';
import pkg from '../package.json' with { type: 'json' };
import run from './commands/run.js';
import sandbox from './commands/sandbox/index.js';

const main = defineCommand({
	meta: {
		name: 'ralph-town',
		version: pkg.version,
		description: 'Disposable Daytona sandboxes for command execution',
	},
	subCommands: {
		run,
		sandbox,
	},
});

const raw_args = process.argv.slice(2);

// Citty treats --help anywhere in rawArgs as CLI help. The run command
// intentionally forwards commands like `pnpx my-pi@latest --help` after
// `--`, so bypass runMain's global help scan for that shape.
if (raw_args[0] === 'run' && raw_args.includes('--')) {
	void runCommand(main, { rawArgs: raw_args });
} else {
	void runMain(main);
}
