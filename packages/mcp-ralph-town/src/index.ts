#!/usr/bin/env node

import { StdioTransport } from '@tmcp/transport-stdio';
import { create_server } from './server.js';

const server = create_server();
const transport = new StdioTransport(server);

transport.listen();
