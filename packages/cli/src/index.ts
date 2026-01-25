#!/usr/bin/env node
/**
 * Ralph CLI
 * Command-line interface for Ralph Loop orchestration
 */

import { defineCommand, runMain } from 'citty';
import run_cmd from './commands/run.js';
import init_cmd from './commands/init.js';
import validate_cmd from './commands/validate.js';

const main = defineCommand({
	meta: {
		name: 'ralph-town',
		version: '0.0.1',
		description: 'Autonomous agent orchestration with Ralph Loop',
	},
	subCommands: {
		run: run_cmd,
		init: init_cmd,
		validate: validate_cmd,
	},
});

runMain(main);
