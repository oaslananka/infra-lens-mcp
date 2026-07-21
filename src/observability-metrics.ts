import type { MetricSnapshot } from './types.js';

export interface MetricPoint {
  name: string;
  help: string;
  value: number;
  labels: Record<string, string>;
  timestampMs: number;
}

export interface LatestMetricOptions {
  now?: number;
  maxAgeSeconds?: number;
  invalidRows?: number;
}

const MB = 1024 * 1024;
const GB = 1024 * 1024 * 1024;

function point(
  points: MetricPoint[],
  name: string,
  help: string,
  value: number | undefined,
  labels: Record<string, string>,
  timestampMs: number
): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) return;
  points.push({ name, help, value, labels, timestampMs });
}

function directionPoints(
  points: MetricPoint[],
  name: string,
  help: string,
  receive: number | undefined,
  transmit: number | undefined,
  host: string,
  interfaceName: string,
  timestampMs: number
): void {
  point(
    points,
    name,
    help,
    receive,
    { host, interface: interfaceName, direction: 'receive' },
    timestampMs
  );
  point(
    points,
    name,
    help,
    transmit,
    { host, interface: interfaceName, direction: 'transmit' },
    timestampMs
  );
}

function addSnapshotPoints(
  points: MetricPoint[],
  snapshot: MetricSnapshot,
  now: number,
  maxAgeSeconds: number
): void {
  const host = snapshot.host;
  const timestampMs = snapshot.timestamp;
  const ageSeconds = Math.max(0, (now - timestampMs) / 1000);

  point(
    points,
    'infra_lens_snapshot_timestamp_seconds',
    'Unix timestamp of the latest persisted observation.',
    timestampMs / 1000,
    { host },
    timestampMs
  );
  point(
    points,
    'infra_lens_snapshot_age_seconds',
    'Age of the latest persisted observation.',
    ageSeconds,
    { host },
    timestampMs
  );
  point(
    points,
    'infra_lens_snapshot_fresh',
    'Whether the latest persisted observation is within the configured maximum age.',
    ageSeconds <= maxAgeSeconds ? 1 : 0,
    { host },
    timestampMs
  );
  point(
    points,
    'infra_lens_cpu_usage_percent',
    'CPU utilization percentage in the latest observation.',
    snapshot.cpu.usage_percent,
    { host },
    timestampMs
  );
  point(
    points,
    'infra_lens_cpu_cores',
    'CPU core count reported by the host.',
    snapshot.cpu.core_count,
    { host },
    timestampMs
  );
  for (const [period, value] of [
    ['1m', snapshot.cpu.load_1],
    ['5m', snapshot.cpu.load_5],
    ['15m', snapshot.cpu.load_15]
  ] as const) {
    point(
      points,
      'infra_lens_cpu_load',
      'System load average by period.',
      value,
      { host, period },
      timestampMs
    );
  }

  point(
    points,
    'infra_lens_memory_usage_percent',
    'Memory utilization percentage in the latest observation.',
    snapshot.memory.usage_percent,
    { host },
    timestampMs
  );
  for (const [state, value] of [
    ['total', snapshot.memory.total_mb * MB],
    ['used', snapshot.memory.used_mb * MB],
    ['free', snapshot.memory.free_mb * MB]
  ] as const) {
    point(
      points,
      'infra_lens_memory_bytes',
      'Memory bytes by state.',
      value,
      { host, state },
      timestampMs
    );
  }
  for (const [state, value] of [
    ['total', snapshot.memory.swap_total_mb * MB],
    ['used', snapshot.memory.swap_used_mb * MB]
  ] as const) {
    point(
      points,
      'infra_lens_swap_bytes',
      'Swap bytes by state.',
      value,
      { host, state },
      timestampMs
    );
  }

  for (const disk of snapshot.disk) {
    const labels = { host, mountpoint: disk.mount };
    point(
      points,
      'infra_lens_disk_usage_percent',
      'Filesystem utilization percentage.',
      disk.usage_percent,
      labels,
      timestampMs
    );
    point(
      points,
      'infra_lens_disk_bytes',
      'Filesystem bytes by state.',
      disk.total_gb * GB,
      { ...labels, state: 'total' },
      timestampMs
    );
    point(
      points,
      'infra_lens_disk_bytes',
      'Filesystem bytes by state.',
      disk.used_gb * GB,
      { ...labels, state: 'used' },
      timestampMs
    );
    point(
      points,
      'infra_lens_inode_usage_percent',
      'Filesystem inode utilization percentage.',
      disk.inode_usage_percent,
      labels,
      timestampMs
    );
  }

  for (const network of snapshot.network) {
    directionPoints(
      points,
      'infra_lens_network_bytes',
      'Network bytes observed during the collector sample window.',
      network.rx_bytes,
      network.tx_bytes,
      host,
      network.interface,
      timestampMs
    );
    directionPoints(
      points,
      'infra_lens_network_packets',
      'Network packets observed during the collector sample window.',
      network.rx_packets,
      network.tx_packets,
      host,
      network.interface,
      timestampMs
    );
    directionPoints(
      points,
      'infra_lens_network_errors',
      'Network errors observed during the collector sample window.',
      network.rx_errors,
      network.tx_errors,
      host,
      network.interface,
      timestampMs
    );
    directionPoints(
      points,
      'infra_lens_network_dropped',
      'Dropped network packets observed during the collector sample window.',
      network.rx_dropped,
      network.tx_dropped,
      host,
      network.interface,
      timestampMs
    );
  }

  point(
    points,
    'infra_lens_system_failed_units',
    'Failed service units reported by the host.',
    snapshot.system.failed_units,
    { host },
    timestampMs
  );
  if (snapshot.system.kernel_signal_available !== false) {
    point(
      points,
      'infra_lens_system_kernel_error_events',
      'Kernel error events in the bounded collector window.',
      snapshot.system.kernel_error_events,
      { host },
      timestampMs
    );
  }
  point(
    points,
    'infra_lens_host_uptime_seconds',
    'Host uptime in seconds.',
    snapshot.os.uptime_seconds,
    { host },
    timestampMs
  );
}

export function buildLatestMetricPoints(
  snapshots: MetricSnapshot[],
  options: LatestMetricOptions = {}
): MetricPoint[] {
  const now = options.now ?? Date.now();
  const maxAgeSeconds = options.maxAgeSeconds ?? 300;
  const points: MetricPoint[] = [];

  for (const snapshot of snapshots) addSnapshotPoints(points, snapshot, now, maxAgeSeconds);
  point(
    points,
    'infra_lens_exporter_snapshots',
    'Latest persisted snapshot rows by validation state.',
    snapshots.length,
    { state: 'valid' },
    now
  );
  point(
    points,
    'infra_lens_exporter_snapshots',
    'Latest persisted snapshot rows by validation state.',
    options.invalidRows ?? 0,
    { state: 'invalid' },
    now
  );

  return points.sort((left, right) => {
    const nameOrder = left.name.localeCompare(right.name);
    if (nameOrder !== 0) return nameOrder;
    return JSON.stringify(left.labels).localeCompare(JSON.stringify(right.labels));
  });
}

function escapeHelp(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('\n', '\\n');
}

function escapeLabel(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll('"', '\\"');
}

function renderLabels(labels: Record<string, string>): string {
  const entries = Object.entries(labels).sort(([left], [right]) => left.localeCompare(right));
  if (entries.length === 0) return '';
  return `{${entries.map(([key, value]) => `${key}="${escapeLabel(value)}"`).join(',')}}`;
}

export function renderOpenMetrics(points: MetricPoint[]): string {
  const lines: string[] = [];
  let previousName: string | undefined;
  for (const metric of points) {
    if (metric.name !== previousName) {
      lines.push(`# HELP ${metric.name} ${escapeHelp(metric.help)}`);
      lines.push(`# TYPE ${metric.name} gauge`);
      previousName = metric.name;
    }
    lines.push(`${metric.name}${renderLabels(metric.labels)} ${String(metric.value)}`);
  }
  lines.push('# EOF');
  return `${lines.join('\n')}\n`;
}
