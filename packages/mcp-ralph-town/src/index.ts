#!/usr/bin/env node

import { StdioTransport } from '@tmcp/transport-stdio';
import { create_server } from './server.js';

const server = create_server();
const transport = new StdioTransport(server);

function handle_shutdown(signal: string) {
	console.error(`Received ${signal}, shutting down gracefully...`);
	process.exit(0);
}

process.on('SIGINT', () => handle_shutdown('SIGINT'));
process.on('SIGTERM', () => handle_shutdown('SIGTERM'));

transport.listen();
