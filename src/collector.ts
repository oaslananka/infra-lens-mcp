import { withSshSession } from './ssh.js';
import { redactSecrets } from './logging.js';
import type {
  CollectionOptions,
  ConnectionInput,
  DiskMetric,
  MetricSnapshot,
  NetworkMetric,
  ProcessMetric
} from './types.js';

/** Raw command output collected from a target Linux host. */
export interface RawMetricOutput {
  cpu: string;
  memory: string;
  disk: string;
  network: string;
  processes: string;
  os: string;
}

/** Pluggable collector runner used by tests and SSH-backed collection. */
export interface CollectorRunner {
  run(connection: ConnectionInput, options: CollectionOptions): Promise<RawMetricOutput>;
}

const CPU_COMMAND =
  "export LC_ALL=C; awk '/^cpu / {print}' /proc/stat; sleep 1; awk '/^cpu / {print}' /proc/stat; cat /proc/loadavg; nproc";
const MEMORY_COMMAND =
  "export LC_ALL=C; free -m | awk 'NR==2 {print $2, $3, $7} NR==3 {print $3, $2}'";
const DISK_COMMAND =
  'export LC_ALL=C; df -BG --output=source,target,size,used,pcent | awk \'NR>1 && $1 != "tmpfs" && $1 != "udev" {gsub("G", "", $3); gsub("G", "", $4); gsub("%", "", $5); print $1, $2, $3, $4, $5}\'';
const NETWORK_COMMAND =
  'export LC_ALL=C; cat /proc/net/dev | awk \'NR>2 {gsub(":", "", $1); if ($1 != "lo") print $1, $2, $10}\'';
const PROCESS_COMMAND =
  'export LC_ALL=C; ps -eo pid,comm,%cpu,%mem --sort=-%cpu | awk \'NR>1 && NR<=11 {printf "%s\\t%s\\t%s\\t%s\\t%s\\n", $1, $2, $3, $4, $2}\'';
const OS_COMMAND =
  'export LC_ALL=C; uname -r; hostname; (source /etc/os-release 2>/dev/null && printf "%s\\n" "$PRETTY_NAME") || echo Unknown; awk \'{print $1}\' /proc/uptime';

class SshCollectorRunner implements CollectorRunner {
  async run(connection: ConnectionInput, options: CollectionOptions): Promise<RawMetricOutput> {
    return withSshSession(connection, async (session) => {
      const [cpu, memory, disk, network, processes, os] = await Promise.all([
        session.exec(CPU_COMMAND),
        session.exec(MEMORY_COMMAND),
        session.exec(DISK_COMMAND),
        options.includeNetwork ? session.exec(NETWORK_COMMAND) : Promise.resolve(null),
        options.includeProcesses ? session.exec(PROCESS_COMMAND) : Promise.resolve(null),
        session.exec(OS_COMMAND)
      ]);
      assertCommandSucceeded('cpu', cpu);
      assertCommandSucceeded('memory', memory);
      assertCommandSucceeded('disk', disk);
      if (network) {
        assertCommandSucceeded('network', network);
      }
      if (processes) {
        assertCommandSucceeded('processes', processes);
      }
      assertCommandSucceeded('os', os);

      return {
        cpu: cpu.stdout,
        memory: memory.stdout,
        disk: disk.stdout,
        network: network?.stdout ?? '',
        processes: processes?.stdout ?? '',
        os: os.stdout
      };
    });
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

function parseDiskMetrics(raw: string): DiskMetric[] {
  return raw
    .split('\n')
    .map((line) => splitFields(line))
    .filter((parts) => parts.length >= 5)
    .map((parts) => ({
      filesystem: parts[0] ?? '',
      mount: parts[1] ?? '',
      total_gb: Number.parseFloat(parts[2] ?? '0'),
      used_gb: Number.parseFloat(parts[3] ?? '0'),
      usage_percent: Number.parseFloat(parts[4] ?? '0')
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
      tx_bytes: Number.parseInt(parts[2] ?? '0', 10)
    }));
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
    disk: parseDiskMetrics(raw.disk),
    network: parseNetworkMetrics(raw.network),
    processes: parseProcessMetrics(raw.processes),
    os: {
      kernel: osLines[0] ?? '',
      hostname: osLines[1] || connection.host,
      distro: osLines[2] || 'Unknown',
      uptime_seconds: Number.parseFloat(osLines[3] ?? '0')
    }
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
