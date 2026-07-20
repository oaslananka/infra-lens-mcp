import { afterAll, afterEach, describe, expect, it } from '@jest/globals';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const children = new Set<ChildProcess>();
const tempRoot = mkdtempSync(join(tmpdir(), 'infra-lens-entrypoints-'));

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Expected TCP address.'));
        return;
      }
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
}

async function waitForHttp(url: string, timeoutMs = 30_000): Promise<Response> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`HTTP process did not become ready: ${String(lastError)}`);
}

async function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve();
    }, 5_000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill('SIGTERM');
  });
}

afterEach(async () => {
  await Promise.all([...children].map(stopChild));
  children.clear();
});

describe('entrypoint child processes', () => {
  it('completes an MCP stdio initialize and tools/list handshake', async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ['--loader', 'ts-node/esm', 'src/mcp.ts'],
      cwd: process.cwd(),
      env: {
        ...process.env,
        INFRA_LENS_DB: join(tempRoot, 'stdio.db')
      },
      stderr: 'pipe'
    });
    const client = new Client({ name: 'entrypoint-process-test', version: '1.0.0' });

    try {
      await client.connect(transport);
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toContain('analyze_server');
      expect(transport.pid).not.toBeNull();
    } finally {
      await transport.close();
    }
  }, 30_000);

  it('starts the HTTP entrypoint on a real port and exits on SIGTERM', async () => {
    const port = await freePort();
    const child = spawn(process.execPath, ['--loader', 'ts-node/esm', 'src/server-http.ts'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        INFRA_LENS_DB: join(tempRoot, 'http.db'),
        MCP_HTTP_HOST: '127.0.0.1',
        MCP_HTTP_PORT: String(port)
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    children.add(child);

    const response = await waitForHttp(
      `http://127.0.0.1:${port}/.well-known/oauth-protected-resource`
    );
    expect(await response.json()).toMatchObject({ oauth_strategy: 'external_gateway' });

    await stopChild(child);
    children.delete(child);
    expect(child.exitCode).toBe(0);
  }, 60_000);
});

afterAll(() => {
  rmSync(tempRoot, { recursive: true, force: true });
});
