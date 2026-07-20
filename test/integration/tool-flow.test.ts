import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { analyzeSnapshot } from '../../src/analyzer.js';
import { getBaseline, getHistory, saveSnapshot } from '../../src/baseline.js';
import type {
  collectSampledSnapshot as collectSampledSnapshotType,
  collectSnapshot as collectSnapshotType
} from '../../src/collector.js';
import { closeAllDatabases } from '../../src/db.js';
import { createToolDefinitions } from '../../src/server-core.js';
import type { MetricSnapshot } from '../../src/types.js';

const TEST_ROOT = join(tmpdir(), 'infra-lens-mcp-integration-tests');
const connection = { host: 'app-01.internal', port: 22, username: 'ops' };

function parsePayload<T>(result: { content: Array<{ text: string }> }): T {
  const payload = result.content[0]?.text;
  if (!payload) {
    throw new Error('Tool response did not include a text payload.');
  }

  return JSON.parse(payload) as T;
}

function makeSnapshot(
  cpuPercent: number,
  timestamp: number,
  overrides: Partial<MetricSnapshot> = {}
): MetricSnapshot {
  return {
    timestamp,
    host: 'app-01.internal',
    cpu: {
      usage_percent: cpuPercent,
      load_1: cpuPercent > 80 ? 4.2 : 0.8,
      load_5: cpuPercent > 80 ? 3.6 : 0.6,
      load_15: cpuPercent > 80 ? 3.1 : 0.5,
      core_count: 4
    },
    memory: {
      total_mb: 8192,
      used_mb: cpuPercent > 80 ? 5120 : 3072,
      free_mb: cpuPercent > 80 ? 3072 : 5120,
      usage_percent: cpuPercent > 80 ? 63 : 38,
      swap_used_mb: 0,
      swap_total_mb: 1024
    },
    disk: [
      {
        filesystem: '/dev/sda1',
        mount: '/',
        total_gb: 100,
        used_gb: cpuPercent > 80 ? 82 : 45,
        usage_percent: cpuPercent > 80 ? 82 : 45
      }
    ],
    network: [{ interface: 'eth0', rx_bytes: 1024, tx_bytes: 2048 }],
    processes: [
      {
        pid: 4200,
        name: cpuPercent > 80 ? 'node' : 'nginx',
        cpu_percent: cpuPercent > 80 ? 77 : 9,
        mem_percent: cpuPercent > 80 ? 12 : 2,
        command: cpuPercent > 80 ? 'node api.js' : 'nginx'
      }
    ],
    os: {
      hostname: 'app-01.internal',
      uptime_seconds: 86_400,
      kernel: '6.8.0',
      distro: 'Ubuntu 24.04'
    },
    ...overrides
  };
}

beforeAll(() => {
  mkdirSync(TEST_ROOT, { recursive: true });
});

beforeEach(() => {
  process.env.INFRA_LENS_DB = join(TEST_ROOT, `integration-${Date.now()}-${Math.random()}.db`);
});

afterEach(() => {
  closeAllDatabases();
});

afterAll(() => {
  if (existsSync(TEST_ROOT)) {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  }
});

describe('integration tool flow', () => {
  it('persists labeled baselines and returns an anomaly-rich baseline comparison', async () => {
    const now = Date.now();
    const baselineSnapshots = Array.from({ length: 5 }, (_, index) =>
      makeSnapshot(22 + index, now - (index + 1) * 60_000)
    );
    const incidentSnapshot = makeSnapshot(92, now, {
      processes: [
        { pid: 18432, name: 'node', cpu_percent: 88, mem_percent: 11, command: 'node api.js' }
      ]
    });
    const collectSnapshot = jest
      .fn<typeof collectSnapshotType>()
      .mockImplementation(async () => baselineSnapshots.shift() ?? incidentSnapshot);
    const collectSampledSnapshot = jest
      .fn<typeof collectSampledSnapshotType>()
      .mockResolvedValue(incidentSnapshot);

    const definitions = createToolDefinitions({
      analyzeSnapshot,
      collectSampledSnapshot,
      collectSnapshot,
      getBaseline,
      getHistory,
      saveSnapshot
    });

    for (let index = 0; index < 5; index += 1) {
      await definitions[2].handler({
        connection,
        label: 'weekday-normal'
      });
    }

    const result = await definitions[3].handler({
      connection,
      baseline_label: 'weekday-normal'
    });
    const payload = parsePayload<{
      baseline_label: string;
      baseline_samples: number;
      health_score: number;
      anomalies: Array<{ metric: string }>;
    }>(result);

    expect(payload.baseline_label).toBe('weekday-normal');
    expect(payload.baseline_samples).toBe(5);
    expect(payload.health_score).toBeLessThan(100);
    expect(payload.anomalies.some((anomaly) => anomaly.metric === 'cpu')).toBe(true);
    expect(payload.anomalies.some((anomaly) => anomaly.metric === 'disk:/')).toBe(true);
  });

  it('saves sampled analysis snapshots and exposes them through history queries with labels', async () => {
    const now = Date.now();
    const collectSampledSnapshot = jest
      .fn<typeof collectSampledSnapshotType>()
      .mockResolvedValue(makeSnapshot(48, now));
    const collectSnapshot = jest
      .fn<typeof collectSnapshotType>()
      .mockResolvedValue(makeSnapshot(26, now - 5 * 60_000));

    const definitions = createToolDefinitions({
      analyzeSnapshot,
      collectSampledSnapshot,
      collectSnapshot,
      getBaseline,
      getHistory,
      saveSnapshot
    });

    const analyzeResult = await definitions[0].handler({
      connection,
      duration_minutes: 5,
      include_processes: true,
      include_network: true
    });
    await definitions[2].handler({
      connection,
      label: 'weekday-normal'
    });
    await definitions[2].handler({
      connection,
      label: 'weekday-normal'
    });

    const defaultHistory = await definitions[4].handler({
      host: connection.host,
      metric: 'cpu',
      hours: 1
    });
    const labeledHistory = await definitions[4].handler({
      host: connection.host,
      metric: 'cpu',
      hours: 1,
      label: 'weekday-normal'
    });

    const analyzePayload = parsePayload<{ collection_window_minutes: number; host: string }>(
      analyzeResult
    );
    const defaultHistoryPayload = parsePayload<{ data_points: number }>(defaultHistory);
    const labeledHistoryPayload = parsePayload<{ data_points: number }>(labeledHistory);

    expect(analyzePayload.collection_window_minutes).toBe(5);
    expect(analyzePayload.host).toBe(connection.host);
    expect(collectSampledSnapshot).toHaveBeenCalledTimes(1);
    expect(defaultHistoryPayload.data_points).toBe(1);
    expect(labeledHistoryPayload.data_points).toBe(2);
  });

  it('keeps repeated incidents out of the approved healthy baseline', async () => {
    const now = Date.now();
    const healthySnapshots = Array.from({ length: 5 }, (_, index) =>
      makeSnapshot(22 + index, now - (index + 1) * 60_000)
    );
    const incidentSnapshot = makeSnapshot(95, now);
    const collectSnapshot = jest
      .fn<typeof collectSnapshotType>()
      .mockImplementation(async () => healthySnapshots.shift() ?? incidentSnapshot);
    const collectSampledSnapshot = jest
      .fn<typeof collectSampledSnapshotType>()
      .mockResolvedValue(incidentSnapshot);

    const definitions = createToolDefinitions({
      analyzeSnapshot,
      collectSampledSnapshot,
      collectSnapshot,
      getBaseline,
      getHistory,
      saveSnapshot
    });

    for (let index = 0; index < 5; index += 1) {
      await definitions[2].handler({ connection, label: 'default' });
    }

    const before = getBaseline(connection.host);
    const zScores: number[] = [];

    for (let index = 0; index < 3; index += 1) {
      const result = await definitions[0].handler({
        connection,
        duration_minutes: 1,
        include_processes: true,
        include_network: true
      });
      const payload = parsePayload<{ anomalies: Array<{ metric: string; z_score?: number }> }>(
        result
      );
      const cpuAnomaly = payload.anomalies.find((anomaly) => anomaly.metric === 'cpu');
      expect(cpuAnomaly).toBeDefined();
      zScores.push(cpuAnomaly?.z_score ?? 0);
    }

    const after = getBaseline(connection.host);
    const observations = getHistory(connection.host, 'cpu', 1);

    expect(before?.sample_count).toBe(5);
    expect(after).toEqual(before);
    expect(observations).toHaveLength(3);
    expect(new Set(zScores).size).toBe(1);
    expect(zScores[0]).toBeGreaterThan(2);
  });
});
