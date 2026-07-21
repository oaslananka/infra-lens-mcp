import { describe, expect, it } from '@jest/globals';

import { buildLatestMetricPoints, renderOpenMetrics } from '../../src/observability-metrics.js';
import type { MetricSnapshot } from '../../src/types.js';

const makeSnapshot = (overrides: Partial<MetricSnapshot> = {}): MetricSnapshot => ({
  timestamp: 1_700_000_000_000,
  host: 'host"one\\line\nnext',
  cpu: { usage_percent: 42.5, load_1: 1, load_5: 0.8, load_15: 0.5, core_count: 4 },
  memory: {
    total_mb: 8192,
    used_mb: 4096,
    free_mb: 4096,
    usage_percent: 50,
    swap_used_mb: 256,
    swap_total_mb: 1024
  },
  disk: [
    {
      filesystem: '/dev/sda1',
      mount: '/data"x',
      total_gb: 100,
      used_gb: 25,
      usage_percent: 25,
      inode_total: 1000,
      inode_used: 250,
      inode_usage_percent: 25
    }
  ],
  network: [
    {
      interface: 'eth0',
      rx_bytes: 2048,
      tx_bytes: 1024,
      rx_packets: 20,
      tx_packets: 10,
      rx_errors: 1,
      tx_errors: 0,
      rx_dropped: 2,
      tx_dropped: 0,
      sample_window_seconds: 1
    }
  ],
  system: {
    failed_units: 2,
    kernel_error_events: 3,
    kernel_signal_available: true,
    kernel_window_minutes: 5
  },
  processes: [
    { pid: 1, name: 'secret', cpu_percent: 5, mem_percent: 2, command: '--token top-secret' }
  ],
  os: { hostname: 'private', uptime_seconds: 900, kernel: 'secret-kernel', distro: 'secret-os' },
  warnings: ['password=secret'],
  ...overrides
});

describe('observability metric contract', () => {
  it('converts latest snapshots into bounded gauge points', () => {
    const points = buildLatestMetricPoints([makeSnapshot()], {
      now: 1_700_000_120_000,
      maxAgeSeconds: 300,
      invalidRows: 2
    });

    expect(points).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'infra_lens_cpu_usage_percent',
          value: 42.5,
          labels: { host: 'host"one\\line\nnext' }
        }),
        expect.objectContaining({
          name: 'infra_lens_memory_bytes',
          value: 8192 * 1024 * 1024,
          labels: { host: 'host"one\\line\nnext', state: 'total' }
        }),
        expect.objectContaining({
          name: 'infra_lens_disk_bytes',
          value: 100 * 1024 * 1024 * 1024,
          labels: { host: 'host"one\\line\nnext', mountpoint: '/data"x', state: 'total' }
        }),
        expect.objectContaining({
          name: 'infra_lens_network_errors',
          value: 1,
          labels: { host: 'host"one\\line\nnext', interface: 'eth0', direction: 'receive' }
        }),
        expect.objectContaining({ name: 'infra_lens_snapshot_fresh', value: 1 }),
        expect.objectContaining({
          name: 'infra_lens_exporter_snapshots',
          value: 2,
          labels: { state: 'invalid' }
        })
      ])
    );
    expect(JSON.stringify(points)).not.toContain('top-secret');
    expect(JSON.stringify(points)).not.toContain('secret-kernel');
    expect(JSON.stringify(points)).not.toContain('password=secret');
  });

  it('marks stale snapshots and omits unavailable or non-finite optional signals', () => {
    const snapshot = makeSnapshot({
      timestamp: 1_000,
      disk: [
        {
          filesystem: '/dev/sdb',
          mount: '/archive',
          total_gb: 5,
          used_gb: Number.NaN,
          usage_percent: 10
        }
      ],
      network: [{ interface: 'eth1', rx_bytes: 5, tx_bytes: 6 }],
      system: { failed_units: 0, kernel_error_events: 99, kernel_signal_available: false }
    });
    const points = buildLatestMetricPoints([snapshot], {
      now: 1_000 + 301_000,
      maxAgeSeconds: 300
    });

    expect(points).toContainEqual(
      expect.objectContaining({ name: 'infra_lens_snapshot_fresh', value: 0 })
    );
    expect(points.some((point) => point.name === 'infra_lens_inode_usage_percent')).toBe(false);
    expect(points.some((point) => point.name === 'infra_lens_network_packets')).toBe(false);
    expect(points.some((point) => point.name === 'infra_lens_system_kernel_error_events')).toBe(
      false
    );
    expect(points.some((point) => Number.isNaN(point.value))).toBe(false);
  });

  it('renders deterministic OpenMetrics with escaped labels and no sample timestamps', () => {
    const output = renderOpenMetrics(
      buildLatestMetricPoints([makeSnapshot()], {
        now: 1_700_000_120_000,
        maxAgeSeconds: 300
      })
    );

    expect(output).toContain('# HELP infra_lens_cpu_usage_percent');
    expect(output).toContain('# TYPE infra_lens_cpu_usage_percent gauge');
    expect(output).toContain('host="host\\"one\\\\line\\nnext"');
    expect(output).toContain('mountpoint="/data\\"x"');
    expect(output).not.toMatch(/infra_lens_cpu_usage_percent\{[^\n]+\}\s+42\.5\s+\d{10,}/);
    expect(output.endsWith('# EOF\n')).toBe(true);
    expect(output.match(/# HELP infra_lens_cpu_load/g) ?? []).toHaveLength(1);
  });
});
