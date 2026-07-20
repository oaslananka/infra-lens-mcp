import { describe, expect, it, beforeEach, afterEach, afterAll } from '@jest/globals';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { analyzeSnapshot } from '../../src/analyzer.js';
import { saveSnapshot } from '../../src/baseline.js';
import { closeAllDatabases } from '../../src/db.js';
import { DEFAULT_THRESHOLDS, type Anomaly, type MetricSnapshot } from '../../src/types.js';

const TEST_ROOT = mkdtempSync(join(tmpdir(), 'infra-lens-mcp-analyzer-'));

const makeSnapshot = (overrides: Partial<MetricSnapshot> = {}): MetricSnapshot => ({
  timestamp: Date.now(),
  host: 'test-server',
  cpu: { usage_percent: 20, load_1: 0.5, load_5: 0.4, load_15: 0.3, core_count: 4 },
  memory: {
    total_mb: 4096,
    used_mb: 1024,
    free_mb: 3072,
    usage_percent: 25,
    swap_used_mb: 0,
    swap_total_mb: 2048
  },
  disk: [{ filesystem: '/dev/sda1', mount: '/', total_gb: 50, used_gb: 10, usage_percent: 20 }],
  network: [{ interface: 'eth0', rx_bytes: 1000, tx_bytes: 500 }],
  system: { failed_units: 0, kernel_error_events: 0 },
  processes: [{ pid: 100, name: 'nginx', cpu_percent: 2, mem_percent: 1, command: 'nginx' }],
  os: { hostname: 'test', uptime_seconds: 86400, kernel: '5.15', distro: 'Ubuntu 22.04' },
  ...overrides
});

beforeEach(() => {
  process.env.INFRA_LENS_DB = join(TEST_ROOT, `analyzer-${Date.now()}-${Math.random()}.db`);
});

afterEach(() => {
  closeAllDatabases();
});

afterAll(() => {
  if (existsSync(TEST_ROOT)) {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  }
});

describe('analyzeSnapshot', () => {
  it('returns healthy for normal metrics', () => {
    const result = analyzeSnapshot(makeSnapshot());
    expect(result.health_score).toBeGreaterThanOrEqual(90);
    expect(result.anomalies).toHaveLength(0);
  });

  it('detects high CPU without baseline', () => {
    const snapshot = makeSnapshot({
      cpu: { usage_percent: 95, load_1: 3.8, load_5: 3.5, load_15: 3.0, core_count: 4 }
    });

    const result = analyzeSnapshot(snapshot);
    const cpuAnomaly = result.anomalies.find((anomaly: Anomaly) => anomaly.metric === 'cpu');

    expect(cpuAnomaly).toBeTruthy();
    expect(cpuAnomaly?.severity).toBe('critical');
    expect(cpuAnomaly?.explanation).toContain('no baseline yet');
  });

  it('detects z-score CPU anomaly when enough baseline samples exist', () => {
    for (let index = 0; index < 6; index += 1) {
      saveSnapshot(
        makeSnapshot({ timestamp: Date.now() - (index + 1) * 60_000 }),
        'default',
        'baseline'
      );
    }

    const result = analyzeSnapshot(
      makeSnapshot({
        cpu: { usage_percent: 78, load_1: 2.0, load_5: 1.8, load_15: 1.2, core_count: 4 },
        processes: [
          { pid: 300, name: 'node', cpu_percent: 61, mem_percent: 8, command: 'node api.js' }
        ]
      })
    );

    const cpuAnomaly = result.anomalies.find((anomaly: Anomaly) => anomaly.metric === 'cpu');

    expect(cpuAnomaly).toBeTruthy();
    expect(cpuAnomaly?.z_score).toBeGreaterThan(2);
    expect(cpuAnomaly?.recommendation).toContain('node api.js');
  });

  it('detects high memory and full disk pressure', () => {
    const snapshot = makeSnapshot({
      memory: {
        total_mb: 4096,
        used_mb: 3900,
        free_mb: 196,
        usage_percent: 95,
        swap_used_mb: 512,
        swap_total_mb: 2048
      },
      disk: [{ filesystem: '/dev/sda1', mount: '/', total_gb: 50, used_gb: 48, usage_percent: 96 }]
    });

    const result = analyzeSnapshot(snapshot);
    const diskAnomaly = result.anomalies.find((anomaly: Anomaly) => anomaly.metric === 'disk:/');

    expect(result.anomalies.some((anomaly: Anomaly) => anomaly.metric === 'memory')).toBe(true);
    expect(result.anomalies.some((anomaly: Anomaly) => anomaly.metric === 'disk:/')).toBe(true);
    expect(diskAnomaly?.severity).toBe('critical');
    expect(result.health_score).toBeLessThan(60);
  });

  it('treats the configured disk critical threshold as critical', () => {
    const result = analyzeSnapshot(
      makeSnapshot({
        disk: [
          { filesystem: '/dev/sda1', mount: '/', total_gb: 50, used_gb: 45, usage_percent: 90 }
        ]
      })
    );

    const diskAnomaly = result.anomalies.find((anomaly: Anomaly) => anomaly.metric === 'disk:/');

    expect(diskAnomaly?.severity).toBe('critical');
  });

  it('detects sustained normalized load above capacity', () => {
    const snapshot = makeSnapshot({
      cpu: { usage_percent: 55, load_1: 7.0, load_5: 6.5, load_15: 5.8, core_count: 4 }
    });

    const result = analyzeSnapshot(snapshot);
    const loadAnomaly = result.anomalies.find((anomaly: Anomaly) => anomaly.metric === 'load');

    expect(loadAnomaly).toBeTruthy();
    expect(loadAnomaly?.severity).toBe('medium');
    expect(loadAnomaly?.z_score).toBeUndefined();
    expect(loadAnomaly?.normalized_load_per_core).toBe(1.8);
    expect(loadAnomaly?.recommendation).toContain('Monitor');
  });

  it('supports custom thresholds without changing default behavior', () => {
    const snapshot = makeSnapshot({
      cpu: { usage_percent: 80, load_1: 1.0, load_5: 0.9, load_15: 0.8, core_count: 4 }
    });

    const defaultResult = analyzeSnapshot(snapshot);
    const customResult = analyzeSnapshot(snapshot, 'default', {
      ...DEFAULT_THRESHOLDS,
      cpu_warn_percent: 75,
      cpu_critical_percent: 85
    });

    expect(defaultResult.anomalies.some((anomaly: Anomaly) => anomaly.metric === 'cpu')).toBe(
      false
    );
    expect(customResult.anomalies.some((anomaly: Anomaly) => anomaly.metric === 'cpu')).toBe(true);
  });

  it('ignores lifetime network counters and unavailable kernel evidence', () => {
    const result = analyzeSnapshot(
      makeSnapshot({
        network: [
          {
            interface: 'eth0',
            rx_bytes: 1000,
            tx_bytes: 2000,
            rx_packets: 10,
            tx_packets: 20,
            rx_errors: 200,
            tx_errors: 100,
            rx_dropped: 50,
            tx_dropped: 25
          }
        ],
        system: {
          failed_units: 0,
          kernel_error_events: 20,
          kernel_signal_available: false,
          kernel_window_minutes: 5
        }
      })
    );

    expect(result.anomalies.some((anomaly) => anomaly.metric.startsWith('network:'))).toBe(false);
    expect(result.anomalies.some((anomaly) => anomaly.metric === 'system:kernel_errors')).toBe(
      false
    );
  });

  it('detects inode, network, and system health pressure', () => {
    const result = analyzeSnapshot(
      makeSnapshot({
        disk: [
          {
            filesystem: '/dev/sda1',
            mount: '/',
            total_gb: 50,
            used_gb: 10,
            usage_percent: 20,
            inode_total: 100000,
            inode_used: 94000,
            inode_usage_percent: 94
          }
        ],
        network: [
          {
            interface: 'eth0',
            rx_bytes: 1000,
            tx_bytes: 2000,
            rx_errors: 2,
            tx_errors: 3,
            rx_dropped: 4,
            tx_dropped: 5,
            sample_window_seconds: 1,
            counter_reset: false
          }
        ],
        system: {
          failed_units: 2,
          kernel_error_events: 1,
          kernel_signal_available: true,
          kernel_window_minutes: 5
        }
      })
    );

    expect(result.anomalies.some((anomaly: Anomaly) => anomaly.metric === 'disk_inode:/')).toBe(
      true
    );
    expect(result.anomalies.some((anomaly: Anomaly) => anomaly.metric === 'network:eth0')).toBe(
      true
    );
    expect(
      result.anomalies.some((anomaly: Anomaly) => anomaly.metric === 'system:failed_units')
    ).toBe(true);
    expect(
      result.anomalies.some((anomaly: Anomaly) => anomaly.metric === 'system:kernel_errors')
    ).toBe(true);
  });
});
