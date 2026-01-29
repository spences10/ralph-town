#!/usr/bin/env node

import { StdioTransport } from '@tmcp/transport-stdio';
import { create_server } from './server.js';
import { kill_all_processes } from './tools/sandbox.js';

const server = create_server();
const transport = new StdioTransport(server);

/** Graceful shutdown handler */
function shutdown(signal: string): void {
	console.error(`Received ${signal}, shutting down...`);
	kill_all_processes();
	process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

transport.listen();
