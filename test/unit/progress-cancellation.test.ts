import { EventEmitter } from 'node:events';

import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { collectSampledSnapshot, type CollectorRunner } from '../../src/collector.js';
import { createToolDefinitions, registerToolsOnServer } from '../../src/server-core.js';
import {
  resetSshWarningStateForTests,
  withSshSession,
  type SshClientLike,
  type SshExecStreamLike
} from '../../src/ssh.js';
import type { MetricSnapshot } from '../../src/types.js';

const connection = { host: 'app-01.internal', port: 22, username: 'ops' };

function rawMetrics(cpuPercent: number) {
  return {
    cpu: `${cpuPercent}\n1.00 0.80 0.60 0/0 0\n4`,
    memory: '4096 1024 3072\n0 0',
    disk: '/dev/sda1 / 100 20 20',
    network: '',
    system: 'failed_units 0\nkernel_error_events 0\nkernel_signal_available 1',
    processes: '',
    os: '6.8.0\napp-01.internal\nUbuntu 24.04\n3600'
  };
}

const baseSnapshot: MetricSnapshot = {
  timestamp: 1,
  host: connection.host,
  cpu: { usage_percent: 20, load_1: 1, load_5: 0.8, load_15: 0.6, core_count: 4 },
  memory: {
    total_mb: 4096,
    used_mb: 1024,
    free_mb: 3072,
    usage_percent: 25,
    swap_used_mb: 0,
    swap_total_mb: 0
  },
  disk: [],
  network: [],
  system: { failed_units: 0, kernel_error_events: 0 },
  processes: [],
  os: { kernel: '6.8.0', hostname: connection.host, distro: 'Ubuntu', uptime_seconds: 3600 },
  warnings: []
};

class PendingStream extends EventEmitter implements SshExecStreamLike {
  closed = false;
  stderr = { on: (_event: 'data', _listener: (chunk: Buffer) => void) => undefined };

  close(): void {
    this.closed = true;
  }
}

class PendingClient extends EventEmitter implements SshClientLike {
  ended = false;

  constructor(
    private readonly stream: PendingStream,
    private readonly becomeReady = true
  ) {
    super();
  }

  exec(
    _command: string,
    callback: (error: Error | undefined, stream: SshExecStreamLike) => void
  ): void {
    callback(undefined, this.stream);
  }

  connect(): void {
    if (this.becomeReady) queueMicrotask(() => this.emit('ready'));
  }

  end(): void {
    this.ended = true;
  }
}

afterEach(() => {
  jest.useRealTimers();
  resetSshWarningStateForTests();
});

describe('sampled collection progress and cancellation', () => {
  it('reports one bounded progress event per completed sample', async () => {
    jest.useFakeTimers();
    let sample = 0;
    const runner: CollectorRunner = {
      run: jest.fn(async () => rawMetrics(++sample * 20))
    };
    const onProgress = jest.fn(async () => undefined);
    const sampled = collectSampledSnapshot as unknown as (
      ...args: unknown[]
    ) => Promise<MetricSnapshot>;

    const promise = sampled(
      connection,
      1,
      30,
      runner,
      { includeProcesses: false, includeNetwork: false },
      { onProgress }
    );

    await jest.advanceTimersByTimeAsync(30_000);
    await promise;

    expect(onProgress.mock.calls).toEqual([
      [
        {
          completedSamples: 1,
          totalSamples: 2,
          progress: 1,
          total: 2,
          message: 'Collected sample 1 of 2.'
        }
      ],
      [
        {
          completedSamples: 2,
          totalSamples: 2,
          progress: 2,
          total: 2,
          message: 'Collected sample 2 of 2.'
        }
      ]
    ]);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('aborts an inter-sample delay, clears its timer, and skips later samples', async () => {
    jest.useFakeTimers();
    const controller = new AbortController();
    const run = jest.fn(async () => rawMetrics(20));
    const runner: CollectorRunner = { run };
    const sampled = collectSampledSnapshot as unknown as (
      ...args: unknown[]
    ) => Promise<MetricSnapshot>;

    const promise = sampled(
      connection,
      1,
      30,
      runner,
      { includeProcesses: false, includeNetwork: false },
      { signal: controller.signal }
    );
    const outcome = promise.then(
      () => null,
      (error: unknown) => error
    );
    await Promise.resolve();
    controller.abort();
    await jest.advanceTimersByTimeAsync(30_000);

    await expect(outcome).resolves.toMatchObject({ name: 'AbortError' });
    expect(run).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('SSH cancellation cleanup', () => {
  it('closes an in-flight command stream and SSH client on cancellation', async () => {
    jest.useFakeTimers();
    const stream = new PendingStream();
    const client = new PendingClient(stream);
    const controller = new AbortController();
    const cancellableSession = withSshSession as unknown as (
      ...args: unknown[]
    ) => Promise<unknown>;

    const promise = cancellableSession(
      connection,
      async (session: { exec(command: string): Promise<unknown> }) => session.exec('uptime'),
      () => client,
      controller.signal
    );
    const outcome = promise.then(
      () => null,
      (error: unknown) => error
    );
    await jest.advanceTimersByTimeAsync(0);
    controller.abort();
    await jest.advanceTimersByTimeAsync(10_000);

    await expect(outcome).resolves.toMatchObject({ name: 'AbortError' });
    expect(stream.closed).toBe(true);
    expect(client.ended).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('cancels connection setup and releases the client before ready', async () => {
    const stream = new PendingStream();
    const client = new PendingClient(stream, false);
    const controller = new AbortController();
    const callback = jest.fn(async () => 'unexpected');
    const cancellableSession = withSshSession as unknown as (
      ...args: unknown[]
    ) => Promise<unknown>;

    const promise = cancellableSession(connection, callback, () => client, controller.signal);
    const outcome = promise.then(
      () => null,
      (error: unknown) => error
    );
    controller.abort();

    await expect(outcome).resolves.toMatchObject({ name: 'AbortError' });
    expect(callback).not.toHaveBeenCalled();
    expect(client.ended).toBe(true);
  });

  it('releases the per-host concurrency slot after cancellation', async () => {
    process.env.MCP_SSH_MAX_SESSIONS_PER_HOST = '1';
    const firstStream = new PendingStream();
    const firstClient = new PendingClient(firstStream);
    const controller = new AbortController();
    const cancellableSession = withSshSession as unknown as (
      ...args: unknown[]
    ) => Promise<unknown>;

    const first = cancellableSession(
      connection,
      async (session: { exec(command: string): Promise<unknown> }) => session.exec('uptime'),
      () => firstClient,
      controller.signal
    );
    const firstOutcome = first.then(
      () => null,
      (error: unknown) => error
    );
    await new Promise<void>((resolve) => setImmediate(resolve));
    controller.abort();
    await expect(firstOutcome).resolves.toMatchObject({ name: 'AbortError' });

    const secondClient = new PendingClient(new PendingStream());
    await expect(
      withSshSession(
        connection,
        async () => 'allowed',
        () => secondClient
      )
    ).resolves.toBe('allowed');
    expect(secondClient.ended).toBe(true);
  });
});

describe('MCP analysis tool lifecycle', () => {
  it('adds a fast single-snapshot analysis tool without changing the sampled tool', async () => {
    const saveSnapshot = jest.fn(() => undefined);
    const collectSnapshot = jest.fn(async () => baseSnapshot);
    const definitions = createToolDefinitions({
      analyzeSnapshot: jest.fn(() => ({ anomalies: [], summary: 'healthy', health_score: 100 })),
      collectSampledSnapshot: jest.fn(async () => baseSnapshot),
      collectSnapshot,
      inspectHostCapabilities: jest.fn(async () => ({ capabilities: [], warnings: [] })),
      getBaseline: jest.fn(() => null),
      getHistory: jest.fn(() => []),
      saveSnapshot
    });
    const fast = definitions.find((definition) => definition.name === 'analyze_server_snapshot');

    expect(fast).toBeDefined();
    const result = await fast!.handler({
      connection,
      include_processes: false,
      include_network: false
    } as never);

    expect(collectSnapshot).toHaveBeenCalledTimes(1);
    expect(saveSnapshot).toHaveBeenCalledWith(baseSnapshot, 'default', 'observation');
    expect(result.structuredContent).toMatchObject({
      collection_mode: 'snapshot',
      collection_window_minutes: 0,
      samples_collected: 1
    });
  });

  it('forwards MCP progress tokens and cancellation signals to sampled collection', async () => {
    const sendNotification = jest.fn(async () => undefined);
    const controller = new AbortController();
    const collectSampledSnapshot = jest.fn(async (...args: unknown[]) => {
      const control = args[5] as {
        signal?: AbortSignal;
        onProgress?: (progress: {
          completedSamples: number;
          totalSamples: number;
          progress: number;
          total: number;
          message: string;
        }) => Promise<void>;
      };
      expect(control.signal).toBe(controller.signal);
      await control.onProgress?.({
        completedSamples: 1,
        totalSamples: 2,
        progress: 1,
        total: 2,
        message: 'Collected sample 1 of 2.'
      });
      return baseSnapshot;
    });
    const server = {
      registered: [] as Array<{
        name: string;
        handler: (input: unknown, extra?: unknown) => Promise<unknown>;
      }>,
      registerTool(
        name: string,
        _config: unknown,
        handler: (input: unknown, extra?: unknown) => Promise<unknown>
      ) {
        this.registered.push({ name, handler });
      }
    };

    registerToolsOnServer(server as never, {
      analyzeSnapshot: jest.fn(() => ({ anomalies: [], summary: 'healthy', health_score: 100 })),
      collectSampledSnapshot,
      collectSnapshot: jest.fn(async () => baseSnapshot),
      inspectHostCapabilities: jest.fn(async () => ({ capabilities: [], warnings: [] })),
      getBaseline: jest.fn(() => null),
      getHistory: jest.fn(() => []),
      saveSnapshot: jest.fn(() => undefined)
    });

    const sampled = server.registered.find((entry) => entry.name === 'analyze_server')!;
    await sampled.handler(
      {
        connection,
        duration_minutes: 1,
        include_processes: false,
        include_network: false
      },
      {
        signal: controller.signal,
        _meta: { progressToken: 'analysis-7' },
        sendNotification
      }
    );

    expect(sendNotification).toHaveBeenCalledWith({
      method: 'notifications/progress',
      params: {
        progressToken: 'analysis-7',
        progress: 1,
        total: 2,
        message: 'Collected sample 1 of 2.'
      }
    });
  });

  it('returns a cancellation error and never persists a cancelled sampled run', async () => {
    const saveSnapshot = jest.fn(() => undefined);
    const abortError = Object.assign(new Error('Analysis cancelled.'), { name: 'AbortError' });
    const definitions = createToolDefinitions({
      analyzeSnapshot: jest.fn(() => ({ anomalies: [], summary: 'healthy', health_score: 100 })),
      collectSampledSnapshot: jest.fn(async () => Promise.reject(abortError)),
      collectSnapshot: jest.fn(async () => baseSnapshot),
      inspectHostCapabilities: jest.fn(async () => ({ capabilities: [], warnings: [] })),
      getBaseline: jest.fn(() => null),
      getHistory: jest.fn(() => []),
      saveSnapshot
    });
    const sampled = definitions.find((definition) => definition.name === 'analyze_server')!;
    const handler = sampled.handler as unknown as (
      input: unknown,
      context: { signal: AbortSignal }
    ) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>;

    const result = await handler(
      {
        connection,
        duration_minutes: 1,
        include_processes: false,
        include_network: false
      },
      { signal: new AbortController().signal }
    );

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toBe('Sampled analysis was cancelled before completion.');
    expect(saveSnapshot).not.toHaveBeenCalled();
  });

  it('rechecks cancellation after collection and before analysis or persistence', async () => {
    const controller = new AbortController();
    const analyzeSnapshot = jest.fn(() => ({
      anomalies: [],
      summary: 'healthy',
      health_score: 100
    }));
    const saveSnapshot = jest.fn(() => undefined);
    const definitions = createToolDefinitions({
      analyzeSnapshot,
      collectSampledSnapshot: jest.fn(async () => {
        controller.abort();
        return baseSnapshot;
      }),
      collectSnapshot: jest.fn(async () => baseSnapshot),
      inspectHostCapabilities: jest.fn(async () => ({ capabilities: [], warnings: [] })),
      getBaseline: jest.fn(() => null),
      getHistory: jest.fn(() => []),
      saveSnapshot
    });
    const sampled = definitions.find((definition) => definition.name === 'analyze_server')!;

    const result = await sampled.handler(
      {
        connection,
        duration_minutes: 1,
        include_processes: false,
        include_network: false
      },
      { signal: controller.signal }
    );

    expect(result).toMatchObject({ isError: true });
    expect(analyzeSnapshot).not.toHaveBeenCalled();
    expect(saveSnapshot).not.toHaveBeenCalled();
  });

  it('does not emit progress notifications when no progress token is supplied', async () => {
    const sendNotification = jest.fn(async () => undefined);
    const collectSampledSnapshot = jest.fn(async (...args: unknown[]) => {
      const control = args[5] as { onProgress?: unknown } | undefined;
      expect(control?.onProgress).toBeUndefined();
      return baseSnapshot;
    });
    const server = {
      registered: [] as Array<{
        name: string;
        handler: (input: unknown, extra?: unknown) => Promise<unknown>;
      }>,
      registerTool(
        name: string,
        _config: unknown,
        handler: (input: unknown, extra?: unknown) => Promise<unknown>
      ) {
        this.registered.push({ name, handler });
      }
    };

    registerToolsOnServer(server as never, {
      analyzeSnapshot: jest.fn(() => ({ anomalies: [], summary: 'healthy', health_score: 100 })),
      collectSampledSnapshot,
      collectSnapshot: jest.fn(async () => baseSnapshot),
      inspectHostCapabilities: jest.fn(async () => ({ capabilities: [], warnings: [] })),
      getBaseline: jest.fn(() => null),
      getHistory: jest.fn(() => []),
      saveSnapshot: jest.fn(() => undefined)
    });

    const sampled = server.registered.find((entry) => entry.name === 'analyze_server')!;
    await sampled.handler(
      {
        connection,
        duration_minutes: 1,
        include_processes: false,
        include_network: false
      },
      {
        signal: new AbortController().signal,
        _meta: {},
        sendNotification
      }
    );

    expect(sendNotification).not.toHaveBeenCalled();
  });
});
