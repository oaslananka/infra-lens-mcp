import { withSshSession } from './ssh.js';
import { redactSecrets } from './logging.js';
import type {
  CollectionOptions,
  ConnectionInput,
  DiskMetric,
  HostCapability,
  MetricSnapshot,
  NetworkMetric,
  ProcessMetric,
  SystemMetric
} from './types.js';

/** Raw command output collected from a target Linux host. */
export interface RawMetricOutput {
  cpu: string;
  memory: string;
  disk: string;
  diskInodes?: string;
  network: string;
  system?: string;
  processes: string;
  os: string;
  warnings?: string[];
}

type CollectionCommandKey =
  | 'cpu'
  | 'memory'
  | 'disk'
  | 'diskInodes'
  | 'network'
  | 'system'
  | 'processes'
  | 'os';

export interface CollectionCommandPlanItem {
  key: CollectionCommandKey;
  name: string;
  command: string;
  required: boolean;
}

/** Pluggable collector runner used by tests and SSH-backed collection. */
export interface CollectorRunner {
  run(connection: ConnectionInput, options: CollectionOptions): Promise<RawMetricOutput>;
  inspectCapabilities?(connection: ConnectionInput): Promise<HostCapability[]>;
}

const CPU_COMMAND =
  "export LC_ALL=C; awk '/^cpu / {print}' /proc/stat; sleep 1; awk '/^cpu / {print}' /proc/stat; cat /proc/loadavg; nproc";
const MEMORY_COMMAND =
  "export LC_ALL=C; free -m | awk 'NR==2 {print $2, $3, $7} NR==3 {print $3, $2}'";
const DISK_COMMAND =
  'export LC_ALL=C; df -BG --output=source,target,size,used,pcent | awk \'NR>1 && $1 != "tmpfs" && $1 != "udev" {gsub("G", "", $3); gsub("G", "", $4); gsub("%", "", $5); print $1, $2, $3, $4, $5}\'';
const DISK_INODE_COMMAND =
  'export LC_ALL=C; df -Pi --output=source,target,itotal,iused,ipcent | awk \'NR>1 && $1 != "tmpfs" && $1 != "udev" {gsub("%", "", $5); print $1, $2, $3, $4, $5}\'';
const NETWORK_COMMAND =
  'export LC_ALL=C; first=$(mktemp); second=$(mktemp); trap \'rm -f "$first" "$second"\' EXIT; cat /proc/net/dev >"$first"; sleep 1; cat /proc/net/dev >"$second"; awk \'function delta(current, previous) { return current >= previous ? current - previous : current } FILENAME == ARGV[1] && FNR > 2 { gsub(":", "", $1); if ($1 != "lo") { seen[$1] = 1; rx_bytes[$1] = $2; rx_packets[$1] = $3; rx_errors[$1] = $4; rx_dropped[$1] = $5; tx_bytes[$1] = $10; tx_packets[$1] = $11; tx_errors[$1] = $12; tx_dropped[$1] = $13 } next } FNR > 2 { gsub(":", "", $1); if ($1 != "lo") { reset = !seen[$1] || $2 < rx_bytes[$1] || $3 < rx_packets[$1] || $4 < rx_errors[$1] || $5 < rx_dropped[$1] || $10 < tx_bytes[$1] || $11 < tx_packets[$1] || $12 < tx_errors[$1] || $13 < tx_dropped[$1]; print $1, delta($2, rx_bytes[$1]), delta($10, tx_bytes[$1]), delta($3, rx_packets[$1]), delta($11, tx_packets[$1]), delta($4, rx_errors[$1]), delta($12, tx_errors[$1]), delta($5, rx_dropped[$1]), delta($13, tx_dropped[$1]), reset ? 1 : 0 } }\' "$first" "$second"';
const SYSTEM_COMMAND =
  'export LC_ALL=C; failed=0; if command -v systemctl >/dev/null 2>&1; then failed=$(systemctl --failed --no-legend --plain --no-pager 2>/dev/null | awk \'NF { count++ } END { print count + 0 }\'); fi; printf "failed_units %s\n" "${failed:-0}"; kernel_window=5; kernel_errors=0; kernel_available=0; if command -v journalctl >/dev/null 2>&1; then kernel_output=$(journalctl -k --since "-${kernel_window} minutes" -p err..emerg --no-pager --output=cat 2>/dev/null); kernel_status=$?; if [ "$kernel_status" -eq 0 ]; then kernel_available=1; kernel_errors=$(printf "%s\n" "$kernel_output" | awk \'NF { count++ } END { print count + 0 }\'); fi; elif command -v dmesg >/dev/null 2>&1 && dmesg --help 2>&1 | grep -q -- --since; then kernel_output=$(dmesg --since "${kernel_window} minutes ago" --level=err,crit,alert,emerg 2>/dev/null); kernel_status=$?; if [ "$kernel_status" -eq 0 ]; then kernel_available=1; kernel_errors=$(printf "%s\n" "$kernel_output" | awk \'NF { count++ } END { print count + 0 }\'); fi; fi; printf "kernel_error_events %s\n" "${kernel_errors:-0}"; printf "kernel_signal_available %s\n" "${kernel_available}"; printf "kernel_window_minutes %s\n" "${kernel_window}"';
const PROCESS_COMMAND =
  'export LC_ALL=C; ps -eo pid,comm,%cpu,%mem --sort=-%cpu | awk \'NR>1 && NR<=11 {printf "%s\\t%s\\t%s\\t%s\\t%s\\n", $1, $2, $3, $4, $2}\'';

const CAPABILITY_CHECKS: Array<{ name: string; source: string; command: string }> = [
  { name: 'proc_stat', source: '/proc/stat', command: 'test -r /proc/stat' },
  { name: 'proc_loadavg', source: '/proc/loadavg', command: 'test -r /proc/loadavg' },
  { name: 'proc_net_dev', source: '/proc/net/dev', command: 'test -r /proc/net/dev' },
  { name: 'free', source: 'free', command: 'command -v free >/dev/null 2>&1' },
  { name: 'df', source: 'df', command: 'command -v df >/dev/null 2>&1' },
  { name: 'df_inodes', source: 'df -Pi', command: 'df -Pi / >/dev/null 2>&1' },
  { name: 'awk', source: 'awk', command: 'command -v awk >/dev/null 2>&1' },
  { name: 'ps', source: 'ps', command: 'command -v ps >/dev/null 2>&1' },
  { name: 'systemctl', source: 'systemctl', command: 'command -v systemctl >/dev/null 2>&1' },
  { name: 'dmesg', source: 'dmesg', command: 'command -v dmesg >/dev/null 2>&1' },
  { name: 'uname', source: 'uname', command: 'command -v uname >/dev/null 2>&1' }
];

const OS_COMMAND =
  'export LC_ALL=C; uname -r; hostname; (source /etc/os-release 2>/dev/null && printf "%s\\n" "$PRETTY_NAME") || echo Unknown; awk \'{print $1}\' /proc/uptime';

export function buildCollectionCommandPlan(
  options: CollectionOptions
): CollectionCommandPlanItem[] {
  return [
    { key: 'cpu', name: 'cpu', command: CPU_COMMAND, required: true },
    { key: 'memory', name: 'memory', command: MEMORY_COMMAND, required: true },
    { key: 'disk', name: 'disk', command: DISK_COMMAND, required: true },
    {
      key: 'diskInodes',
      name: 'disk inode',
      command: DISK_INODE_COMMAND,
      required: false
    },
    ...(options.includeNetwork
      ? [{ key: 'network' as const, name: 'network', command: NETWORK_COMMAND, required: false }]
      : []),
    { key: 'system', name: 'system', command: SYSTEM_COMMAND, required: false },
    ...(options.includeProcesses
      ? [
          {
            key: 'processes' as const,
            name: 'processes',
            command: PROCESS_COMMAND,
            required: false
          }
        ]
      : []),
    { key: 'os', name: 'os', command: OS_COMMAND, required: true }
  ];
}

class SshCollectorRunner implements CollectorRunner {
  async run(connection: ConnectionInput, options: CollectionOptions): Promise<RawMetricOutput> {
    return withSshSession(connection, async (session) => {
      const warnings: string[] = [];
      const plan = buildCollectionCommandPlan(options);
      const executed = await Promise.all(
        plan.map(async (item) => [item, await session.exec(item.command)] as const)
      );
      const results = new Map(executed.map(([item, result]) => [item.key, { item, result }]));

      for (const { item, result } of results.values()) {
        if (item.required) {
          assertCommandSucceeded(item.name, result);
        }
      }

      const requiredOutput = (key: CollectionCommandKey): string => {
        const entry = results.get(key);
        if (!entry) {
          throw new Error(`Collector command plan omitted required output ${key}.`);
        }
        return entry.result.stdout;
      };
      const optionalOutput = (key: CollectionCommandKey): string => {
        const entry = results.get(key);
        return entry ? commandOutputOrWarning(entry.item.name, entry.result, warnings) : '';
      };

      return {
        cpu: requiredOutput('cpu'),
        memory: requiredOutput('memory'),
        disk: requiredOutput('disk'),
        diskInodes: optionalOutput('diskInodes'),
        network: optionalOutput('network'),
        system: optionalOutput('system'),
        processes: optionalOutput('processes'),
        os: requiredOutput('os'),
        warnings
      };
    });
  }

  async inspectCapabilities(connection: ConnectionInput): Promise<HostCapability[]> {
    return withSshSession(connection, async (session) =>
      Promise.all(
        CAPABILITY_CHECKS.map(async (check) => {
          const result = await session.exec(check.command);
          return {
            name: check.name,
            available: result.code === 0,
            source: check.source,
            ...(result.code === 0
              ? {}
              : { detail: redactSecrets(result.stderr || `exit code ${result.code}`) })
          };
        })
      )
    );
  }
}

const DEFAULT_COLLECTION_OPTIONS: CollectionOptions = {
  includeProcesses: true,
  includeNetwork: true
};

function assertCommandSucceeded(
  name: string,
  result: { code: number; stderr: string; stdout: string }
): void {
  if (result.code !== 0 || result.stderr.length > 0) {
    const detail = redactSecrets(result.stderr || `exit code ${result.code}`);
    throw new Error(`SSH ${name} collection failed: ${detail}`);
  }
}

function commandOutputOrWarning(
  name: string,
  result: { code: number; stderr: string; stdout: string } | null,
  warnings: string[]
): string {
  if (!result) {
    return '';
  }

  if (result.code === 0 && result.stderr.length === 0) {
    return result.stdout;
  }

  const detail = redactSecrets(result.stderr || `exit code ${result.code}`);
  warnings.push(`SSH ${name} collection skipped: ${detail}`);
  return '';
}

function averageSnapshots(
  snapshots: MetricSnapshot[],
  selector: (snapshot: MetricSnapshot) => number
): number {
  return snapshots.reduce((total, snapshot) => total + selector(snapshot), 0) / snapshots.length;
}

function roundTo(value: number, decimalPlaces = 1): number {
  const factor = 10 ** decimalPlaces;
  return Math.round(value * factor) / factor;
}

function splitFields(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

function parseCpuUsage(raw: string): {
  usage_percent: number;
  load_1: number;
  load_5: number;
  load_15: number;
  core_count: number;
} {
  const lines = raw.split('\n').filter(Boolean);
  const firstStat = lines[0]?.startsWith('cpu ') ? splitFields(lines[0]) : undefined;
  const secondStat = lines[1]?.startsWith('cpu ') ? splitFields(lines[1]) : undefined;
  const loadLineIndex = firstStat && secondStat ? 2 : 1;
  const usagePercent =
    firstStat && secondStat
      ? calculateCpuDeltaPercent(firstStat, secondStat)
      : Number.parseFloat(lines[0] ?? '0');
  const loadParts = splitFields(lines[loadLineIndex] ?? '');

  return {
    usage_percent: usagePercent,
    load_1: Number.parseFloat(loadParts[0] ?? '0'),
    load_5: Number.parseFloat(loadParts[1] ?? '0'),
    load_15: Number.parseFloat(loadParts[2] ?? '0'),
    core_count: Number.parseInt(lines[loadLineIndex + 1] ?? '1', 10)
  };
}

function calculateCpuDeltaPercent(firstStat: string[], secondStat: string[]): number {
  const firstValues = firstStat.slice(1).map((part) => Number.parseInt(part, 10));
  const secondValues = secondStat.slice(1).map((part) => Number.parseInt(part, 10));
  const firstIdle = (firstValues[3] ?? 0) + (firstValues[4] ?? 0);
  const secondIdle = (secondValues[3] ?? 0) + (secondValues[4] ?? 0);
  const firstTotal = firstValues.reduce((sum, value) => sum + value, 0);
  const secondTotal = secondValues.reduce((sum, value) => sum + value, 0);
  const totalDelta = secondTotal - firstTotal;
  const idleDelta = secondIdle - firstIdle;

  if (totalDelta <= 0) {
    return 0;
  }

  return roundTo(Math.max(0, Math.min(100, (1 - idleDelta / totalDelta) * 100)));
}

function parseDiskMetrics(raw: string, inodeRaw = ''): DiskMetric[] {
  const inodeByMount = new Map<string, Partial<DiskMetric>>();
  for (const parts of inodeRaw
    .split('\n')
    .map((line) => splitFields(line))
    .filter((candidate) => candidate.length >= 5)) {
    inodeByMount.set(`${parts[0] ?? ''}\0${parts[1] ?? ''}`, {
      inode_total: Number.parseInt(parts[2] ?? '0', 10),
      inode_used: Number.parseInt(parts[3] ?? '0', 10),
      inode_usage_percent: Number.parseFloat(parts[4] ?? '0')
    });
  }

  return raw
    .split('\n')
    .map((line) => splitFields(line))
    .filter((parts) => parts.length >= 5)
    .map((parts) => ({
      filesystem: parts[0] ?? '',
      mount: parts[1] ?? '',
      total_gb: Number.parseFloat(parts[2] ?? '0'),
      used_gb: Number.parseFloat(parts[3] ?? '0'),
      usage_percent: Number.parseFloat(parts[4] ?? '0'),
      ...inodeByMount.get(`${parts[0] ?? ''}\0${parts[1] ?? ''}`)
    }));
}

function parseNetworkMetrics(raw: string): NetworkMetric[] {
  return raw
    .split('\n')
    .map((line) => splitFields(line))
    .filter((parts) => parts.length >= 3)
    .map((parts) => ({
      interface: parts[0] ?? '',
      rx_bytes: Number.parseInt(parts[1] ?? '0', 10),
      tx_bytes: Number.parseInt(parts[2] ?? '0', 10),
      ...(parts.length >= 9
        ? {
            rx_packets: Number.parseInt(parts[3] ?? '0', 10),
            tx_packets: Number.parseInt(parts[4] ?? '0', 10),
            rx_errors: Number.parseInt(parts[5] ?? '0', 10),
            tx_errors: Number.parseInt(parts[6] ?? '0', 10),
            rx_dropped: Number.parseInt(parts[7] ?? '0', 10),
            tx_dropped: Number.parseInt(parts[8] ?? '0', 10),
            ...(parts.length >= 10
              ? {
                  sample_window_seconds: 1,
                  counter_reset: parts[9] === '1'
                }
              : {})
          }
        : {})
    }));
}

function parseSystemMetrics(raw: string): SystemMetric {
  const values = new Map<string, number>();
  for (const parts of raw
    .split('\n')
    .map((line) => splitFields(line))
    .filter((candidate) => candidate.length >= 2)) {
    values.set(parts[0] ?? '', Number.parseInt(parts[1] ?? '0', 10));
  }

  return {
    failed_units: values.get('failed_units') ?? 0,
    kernel_error_events: values.get('kernel_error_events') ?? 0,
    ...(values.has('kernel_signal_available')
      ? { kernel_signal_available: values.get('kernel_signal_available') === 1 }
      : {}),
    ...(values.has('kernel_window_minutes')
      ? { kernel_window_minutes: values.get('kernel_window_minutes') }
      : {})
  };
}

function parseProcessMetrics(raw: string): ProcessMetric[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const tabSeparated = line.split('\t');
      if (tabSeparated.length >= 5) {
        const [pid, name, cpuPercent, memPercent, ...commandParts] = tabSeparated;
        return {
          pid: Number.parseInt(pid ?? '0', 10),
          name: name ?? '',
          cpu_percent: Number.parseFloat(cpuPercent ?? '0'),
          mem_percent: Number.parseFloat(memPercent ?? '0'),
          command: redactProcessCommand(commandParts.join('\t').trim())
        };
      }

      const fallbackMatch = line.match(/^(\d+)\s+(\S+)\s+([0-9.]+)\s+([0-9.]+)\s+(.+)$/);
      return {
        pid: Number.parseInt(fallbackMatch?.[1] ?? '0', 10),
        name: fallbackMatch?.[2] ?? '',
        cpu_percent: Number.parseFloat(fallbackMatch?.[3] ?? '0'),
        mem_percent: Number.parseFloat(fallbackMatch?.[4] ?? '0'),
        command: redactProcessCommand(fallbackMatch?.[5] ?? '')
      };
    });
}

function redactProcessCommand(command: string): string {
  return redactSecrets(command);
}

export async function inspectHostCapabilities(
  connection: ConnectionInput,
  runner: CollectorRunner = new SshCollectorRunner()
): Promise<{ capabilities: HostCapability[]; warnings: string[] }> {
  if (!runner.inspectCapabilities) {
    return {
      capabilities: [],
      warnings: ['Collector runner does not support capability inspection.']
    };
  }

  const capabilities = await runner.inspectCapabilities(connection);
  const warnings = capabilities
    .filter((capability) => !capability.available)
    .map(
      (capability) =>
        `${capability.name} is unavailable${capability.detail ? `: ${capability.detail}` : ''}`
    );

  return { capabilities, warnings };
}

export async function collectSnapshot(
  connection: ConnectionInput,
  runner: CollectorRunner = new SshCollectorRunner(),
  options: CollectionOptions = DEFAULT_COLLECTION_OPTIONS
): Promise<MetricSnapshot> {
  const raw = await runner.run(connection, options);
  const cpu = parseCpuUsage(raw.cpu);
  const memoryLines = raw.memory.split('\n').filter(Boolean);
  const memoryParts = splitFields(memoryLines[0] ?? '');
  const swapParts = splitFields(memoryLines[1] ?? '');
  const totalMemory = Number.parseInt(memoryParts[0] ?? '0', 10);
  const availableMemory = Number.parseInt(memoryParts[2] ?? memoryParts[1] ?? '0', 10);
  const usedMemory = Math.max(0, totalMemory - availableMemory);
  const osLines = raw.os.split('\n');

  const network = parseNetworkMetrics(raw.network);
  const system = parseSystemMetrics(raw.system ?? '');
  const warnings = [...(raw.warnings ?? [])];

  for (const metric of network) {
    const hasQualityCounters =
      metric.rx_errors !== undefined ||
      metric.tx_errors !== undefined ||
      metric.rx_dropped !== undefined ||
      metric.tx_dropped !== undefined;
    if (hasQualityCounters && metric.sample_window_seconds === undefined) {
      warnings.push(
        `Network quality counters were not sampled over a bounded window; anomaly detection skipped for ${metric.interface}.`
      );
    }
    if (metric.counter_reset) {
      warnings.push(
        `Network counters reset or wrapped during the sample window for ${metric.interface}; anomaly detection skipped for that interface.`
      );
    }
  }

  if (system.kernel_signal_available === false) {
    warnings.push(
      'Recent kernel error evidence is unavailable; kernel anomaly detection was skipped.'
    );
  }

  return {
    timestamp: Date.now(),
    host: connection.host,
    cpu,
    memory: {
      total_mb: totalMemory,
      used_mb: usedMemory,
      free_mb: availableMemory,
      usage_percent: totalMemory > 0 ? Math.round((usedMemory / totalMemory) * 100) : 0,
      swap_used_mb: Number.parseInt(swapParts[0] ?? '0', 10),
      swap_total_mb: Number.parseInt(swapParts[1] ?? '0', 10)
    },
    disk: parseDiskMetrics(raw.disk, raw.diskInodes),
    network,
    system,
    processes: parseProcessMetrics(raw.processes),
    os: {
      kernel: osLines[0] ?? '',
      hostname: osLines[1] || connection.host,
      distro: osLines[2] || 'Unknown',
      uptime_seconds: Number.parseFloat(osLines[3] ?? '0')
    },
    warnings
  };
}

export async function collectSampledSnapshot(
  connection: ConnectionInput,
  durationMinutes: number,
  intervalSeconds = 30,
  runner: CollectorRunner = new SshCollectorRunner(),
  options: CollectionOptions = DEFAULT_COLLECTION_OPTIONS
): Promise<MetricSnapshot> {
  const totalSamples = Math.max(1, Math.floor((durationMinutes * 60) / intervalSeconds));
  const snapshots: MetricSnapshot[] = [];

  for (let index = 0; index < totalSamples; index += 1) {
    snapshots.push(await collectSnapshot(connection, runner, options));

    if (index < totalSamples - 1) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, intervalSeconds * 1000);
      });
    }
  }

  const lastSnapshot = snapshots[snapshots.length - 1];
  if (!lastSnapshot) {
    throw new Error('No metric snapshots were collected.');
  }

  return {
    ...lastSnapshot,
    cpu: {
      ...lastSnapshot.cpu,
      usage_percent: roundTo(averageSnapshots(snapshots, (snapshot) => snapshot.cpu.usage_percent)),
      load_1: roundTo(
        averageSnapshots(snapshots, (snapshot) => snapshot.cpu.load_1),
        2
      ),
      load_5: roundTo(
        averageSnapshots(snapshots, (snapshot) => snapshot.cpu.load_5),
        2
      ),
      load_15: roundTo(
        averageSnapshots(snapshots, (snapshot) => snapshot.cpu.load_15),
        2
      )
    },
    memory: {
      ...lastSnapshot.memory,
      total_mb: Math.round(averageSnapshots(snapshots, (snapshot) => snapshot.memory.total_mb)),
      used_mb: Math.round(averageSnapshots(snapshots, (snapshot) => snapshot.memory.used_mb)),
      free_mb: Math.round(averageSnapshots(snapshots, (snapshot) => snapshot.memory.free_mb)),
      usage_percent: roundTo(
        averageSnapshots(snapshots, (snapshot) => snapshot.memory.usage_percent)
      ),
      swap_used_mb: Math.round(
        averageSnapshots(snapshots, (snapshot) => snapshot.memory.swap_used_mb)
      ),
      swap_total_mb: Math.round(
        averageSnapshots(snapshots, (snapshot) => snapshot.memory.swap_total_mb)
      )
    }
  };
}
