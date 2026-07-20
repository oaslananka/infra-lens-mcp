#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { isMainModule } from './entrypoint.js';
import { registerToolsOnServer } from './server-core.js';
import { createStdioShutdownHandler, type AsyncCloseable } from './shutdown.js';
import { getPackageVersion } from './version.js';

interface StdioServerLike extends AsyncCloseable {
  connect(transport: unknown): Promise<void>;
}

interface SignalRegistrar {
  once(signal: 'SIGTERM' | 'SIGINT', listener: () => void): unknown;
}

export interface StdioRuntimeDependencies {
  server?: StdioServerLike;
  transport?: unknown;
  signals?: SignalRegistrar;
  exit?: (code: number) => void;
}

export interface StdioRuntime {
  server: StdioServerLike;
  transport: unknown;
}

export async function createStdioServer(): Promise<McpServer> {
  const server = new McpServer(
    {
      name: 'infra-lens-mcp',
      version: getPackageVersion()
    },
    {
      capabilities: {
        logging: {}
      }
    }
  );

  registerToolsOnServer(server);
  return server;
}

export async function startStdioRuntime(
  dependencies: StdioRuntimeDependencies = {}
): Promise<StdioRuntime> {
  const server = dependencies.server ?? (await createStdioServer());
  const transport = dependencies.transport ?? new StdioServerTransport();
  const signals = dependencies.signals ?? process;

  await server.connect(transport);

  const shutdown = createStdioShutdownHandler(server, dependencies.exit);
  signals.once('SIGTERM', () => shutdown('SIGTERM'));
  signals.once('SIGINT', () => shutdown('SIGINT'));

  return { server, transport };
}

/* istanbul ignore next -- exercised by black-box process tests */
if (isMainModule(import.meta.url)) {
  await startStdioRuntime();
}
