#!/usr/bin/env node
/**
 * Ralph CLI
 * Command-line interface for Daytona-based agent orchestration
 */

import { defineCommand, runMain } from 'citty';
import sandbox from './commands/sandbox/index.js';

const main = defineCommand({
	meta: {
		name: 'ralph-town',
		version: '0.0.1',
		description: 'Daytona-based agent orchestration',
	},
	subCommands: {
		sandbox,
	},
});

runMain(main);
