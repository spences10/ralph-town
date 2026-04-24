#!/usr/bin/env node
/**
 * Ralph CLI
 * Command-line interface for Daytona-based agent orchestration
 */

import { defineCommand, runMain } from 'citty';
import pkg from '../package.json' with { type: 'json' };
import sandbox from './commands/sandbox/index.js';

const main = defineCommand({
	meta: {
		name: 'ralph-town',
		version: pkg.version,
		description: 'Daytona-based agent orchestration',
	},
	subCommands: {
		sandbox,
	},
});

void runMain(main);
