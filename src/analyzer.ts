import * as ss from 'simple-statistics';

import { getBaseline } from './baseline.js';
import {
  DEFAULT_THRESHOLDS,
  type AnalysisThresholds,
  type Anomaly,
  type MetricSnapshot,
  type ProcessMetric
} from './types.js';

function selectTopCpuProcess(processes: ProcessMetric[]): ProcessMetric | undefined {
  return [...processes].sort((left, right) => right.cpu_percent - left.cpu_percent)[0];
}

function selectTopMemoryProcess(processes: ProcessMetric[]): ProcessMetric | undefined {
  return [...processes].sort((left, right) => right.mem_percent - left.mem_percent)[0];
}

function roundTo(value: number, places = 1): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function robustScore(samples: number[], value: number): { median: number; score: number } {
  const median = ss.median(samples);
  const mad = ss.median(samples.map((sample) => Math.abs(sample - median)));
  const score = mad > 0 ? (0.6745 * (value - median)) / mad : value >= median + 20 ? 3 : 0;
  return { median: roundTo(median), score: roundTo(score) };
}

function confidenceFor(severity: Anomaly['severity'], hasBaseline: boolean): number {
  const base =
    severity === 'critical' ? 0.9 : severity === 'high' ? 0.82 : severity === 'medium' ? 0.7 : 0.58;
  return roundTo(Math.min(0.98, base + (hasBaseline ? 0.05 : 0)), 2);
}

function enrich(
  snapshot: MetricSnapshot,
  anomaly: Anomaly,
  hasBaseline: boolean,
  extraEvidence: string[] = []
): Anomaly {
  const evidence = anomaly.evidence ?? [anomaly.explanation, ...extraEvidence];
  return {
    ...anomaly,
    confidence: anomaly.confidence ?? confidenceFor(anomaly.severity, hasBaseline),
    root_cause_hypothesis:
      anomaly.root_cause_hypothesis ?? inferRootCause(snapshot, anomaly.metric),
    evidence,
    suggested_next_checks: anomaly.suggested_next_checks ?? nextChecksFor(anomaly.metric)
  };
}

function inferRootCause(snapshot: MetricSnapshot, metric: string): string {
  const topCpu = selectTopCpuProcess(snapshot.processes);
  const topMemory = selectTopMemoryProcess(snapshot.processes);
  if (metric === 'cpu' && topCpu && topCpu.cpu_percent >= 40) {
    return `${topCpu.command} is the most likely CPU pressure driver.`;
  }
  if (metric === 'memory' && topMemory) {
    return `${topMemory.command} is the most likely memory pressure driver.`;
  }
  if (metric.startsWith('disk_inode:')) return 'Inode pressure is higher than byte pressure.';
  if (metric.startsWith('disk:')) return 'The filesystem is approaching byte capacity.';
  if (metric.startsWith('network:')) return 'Interface counters show packet quality loss.';
  if (metric.startsWith('system:')) return 'Service or kernel signals may explain the incident.';
  if (metric === 'load') return 'Load suggests runnable queue or IO wait pressure.';
  return 'The signal deviates from the expected operating envelope.';
}

function nextChecksFor(metric: string): string[] {
  if (metric === 'cpu') {
    return [
      'Inspect the top CPU process.',
      'Correlate with deploy or traffic windows.',
      'Record a healthy baseline after recovery.'
    ];
  }
  if (metric === 'memory') {
    return [
      'Check process memory growth.',
      'Review OOM and kernel logs.',
      'Compare with baseline windows.'
    ];
  }
  if (metric.startsWith('disk')) {
    return [
      'Inspect large or high-file-count paths.',
      'Check retention and cache paths.',
      'Plan cleanup or capacity expansion.'
    ];
  }
  if (metric.startsWith('network:')) {
    return [
      'Compare NIC counters with upstream metrics.',
      'Check MTU and interface resets.',
      'Correlate with latency.'
    ];
  }
  if (metric.startsWith('system:')) {
    return [
      'Inspect service or kernel messages.',
      'Correlate with restart times.',
      'Check dependent services.'
    ];
  }
  return [
    'Correlate with recent changes.',
    'Compare against baseline windows.',
    'Collect another snapshot.'
  ];
}

export function analyzeSnapshot(
  snapshot: MetricSnapshot,
  baselineLabel = 'default',
  thresholds: AnalysisThresholds = DEFAULT_THRESHOLDS
): {
  anomalies: Anomaly[];
  summary: string;
  health_score: number;
} {
  const baseline = getBaseline(snapshot.host, baselineLabel);
  const anomalies: Anomaly[] = [];
  const system = snapshot.system ?? { failed_units: 0, kernel_error_events: 0 };
  const memoryHighPercent =
    thresholds.memory_warn_percent +
    (thresholds.memory_critical_percent - thresholds.memory_warn_percent) / 2;
  const loadHighRatio =
    thresholds.load_warn_ratio + (thresholds.load_critical_ratio - thresholds.load_warn_ratio) / 3;

  if (baseline?.cpu_samples && baseline.cpu_samples.length >= 5) {
    const mean = ss.mean(baseline.cpu_samples);
    const stdDeviation = ss.standardDeviation(baseline.cpu_samples);
    const robust = robustScore(baseline.cpu_samples, snapshot.cpu.usage_percent);
    const recentMean = roundTo(
      ss.mean(baseline.cpu_samples.slice(0, Math.min(10, baseline.cpu_samples.length)))
    );
    const zScore =
      stdDeviation > 0
        ? (snapshot.cpu.usage_percent - mean) / stdDeviation
        : snapshot.cpu.usage_percent >= mean + 20
          ? 3
          : 0;

    if (
      Math.abs(zScore) > thresholds.zscore_threshold ||
      Math.abs(robust.score) > thresholds.zscore_threshold ||
      snapshot.cpu.usage_percent > thresholds.cpu_warn_percent
    ) {
      const topProcess = selectTopCpuProcess(snapshot.processes);
      const severity: Anomaly['severity'] =
        snapshot.cpu.usage_percent >= thresholds.cpu_critical_percent
          ? 'critical'
          : snapshot.cpu.usage_percent > thresholds.cpu_warn_percent
            ? 'high'
            : 'medium';
      anomalies.push({
        metric: 'cpu',
        severity,
        value: snapshot.cpu.usage_percent,
        baseline_mean: Number(mean.toFixed(1)),
        baseline_median: robust.median,
        z_score: Number(zScore.toFixed(1)),
        robust_z_score: robust.score,
        confidence: confidenceFor(severity, true),
        root_cause_hypothesis:
          topProcess && topProcess.cpu_percent >= 40
            ? `${topProcess.command} is the most likely CPU pressure driver.`
            : 'CPU deviates from baseline and needs workload correlation.',
        evidence: [
          `CPU ${snapshot.cpu.usage_percent}% vs mean ${roundTo(mean)}%, median ${robust.median}%, recent ${recentMean}%.`,
          `Standard z-score ${roundTo(zScore)} and robust z-score ${robust.score}.`,
          `Top CPU process: ${topProcess?.command ?? 'unknown'} (${topProcess?.cpu_percent ?? 0}%).`
        ],
        suggested_next_checks: [
          'Inspect the top CPU process.',
          'Correlate with deploy or traffic windows.',
          'Record a healthy baseline after recovery.'
        ],
        explanation: `CPU is at ${snapshot.cpu.usage_percent}% (${zScore.toFixed(
          1
        )}σ above baseline ${mean.toFixed(1)}%, robust ${robust.score}σ from median ${robust.median}%). Load is ${snapshot.cpu.load_1}/${snapshot.cpu.load_5}/${snapshot.cpu.load_15}. Top CPU consumer: ${topProcess?.command ?? 'unknown'} (${topProcess?.cpu_percent ?? 0}%).`,
        recommendation:
          snapshot.cpu.usage_percent > 90
            ? `Investigate ${topProcess?.command ?? 'the top process'} (PID ${topProcess?.pid ?? 0}) and review application logs or scale-out options.`
            : `Monitor ${topProcess?.command ?? 'the active workload'} and confirm whether this spike matches an expected traffic pattern.`
      });
    }
  } else if (snapshot.cpu.usage_percent > thresholds.cpu_warn_percent) {
    const topProcess = selectTopCpuProcess(snapshot.processes);
    const severity: Anomaly['severity'] =
      snapshot.cpu.usage_percent >= thresholds.cpu_critical_percent ? 'critical' : 'high';
    anomalies.push({
      metric: 'cpu',
      severity,
      value: snapshot.cpu.usage_percent,
      baseline_mean: 0,
      confidence: confidenceFor(severity, false),
      root_cause_hypothesis:
        topProcess && topProcess.cpu_percent >= 40
          ? `${topProcess.command} is the most likely CPU pressure driver, but baseline confidence is limited.`
          : 'CPU is high without enough baseline samples to separate normal load from anomaly.',
      evidence: [
        `CPU ${snapshot.cpu.usage_percent}% exceeds warning threshold ${thresholds.cpu_warn_percent}%.`,
        `Top process: ${topProcess?.command ?? 'unknown'}.`
      ],
      suggested_next_checks: [
        'Record at least five healthy baseline samples.',
        'Check top process logs and recent changes.',
        'Confirm whether traffic or scheduled jobs explain the spike.'
      ],
      explanation: `CPU is at ${snapshot.cpu.usage_percent}% with no baseline yet. Top process: ${topProcess?.command ?? 'unknown'}.`,
      recommendation:
        'Record more baseline samples with record_baseline before relying on z-score anomaly detection.'
    });
  }

  if (snapshot.memory.usage_percent > thresholds.memory_warn_percent) {
    const topMemoryProcess = selectTopMemoryProcess(snapshot.processes);
    anomalies.push({
      metric: 'memory',
      severity:
        snapshot.memory.usage_percent > thresholds.memory_critical_percent
          ? 'critical'
          : snapshot.memory.usage_percent > memoryHighPercent
            ? 'high'
            : 'medium',
      value: snapshot.memory.usage_percent,
      baseline_mean: baseline?.memory_mean ?? 0,
      explanation: `Memory usage is ${snapshot.memory.usage_percent}% (${snapshot.memory.used_mb}MB/${snapshot.memory.total_mb}MB). Swap usage is ${snapshot.memory.swap_used_mb}MB. Top memory consumer: ${topMemoryProcess?.command ?? 'unknown'} (${topMemoryProcess?.mem_percent ?? 0}%).`,
      recommendation:
        snapshot.memory.usage_percent > 95
          ? `OOM risk is high. Restart or scale ${topMemoryProcess?.command ?? 'the affected service'} immediately.`
          : `Check ${topMemoryProcess?.command ?? 'the active process'} for leaks or oversized heap settings.`
    });
  }

  for (const disk of snapshot.disk) {
    const storageUsage = Math.max(disk.usage_percent, disk.inode_usage_percent ?? 0);
    const pressureKind =
      disk.inode_usage_percent !== undefined && disk.inode_usage_percent > disk.usage_percent
        ? 'inode'
        : 'space';
    if (storageUsage > thresholds.disk_warn_percent) {
      anomalies.push({
        metric: `${pressureKind === 'inode' ? 'disk_inode' : 'disk'}:${disk.mount}`,
        severity:
          storageUsage >= thresholds.disk_critical_percent
            ? 'critical'
            : storageUsage >=
                thresholds.disk_warn_percent +
                  (thresholds.disk_critical_percent - thresholds.disk_warn_percent) / 2
              ? 'high'
              : 'medium',
        value: storageUsage,
        baseline_mean: 0,
        explanation:
          pressureKind === 'inode'
            ? `Disk ${disk.mount} inode usage is ${disk.inode_usage_percent}% (${disk.inode_used ?? 0}/${disk.inode_total ?? 0} inodes). Space usage is ${disk.usage_percent}%.`
            : `Disk ${disk.mount} is ${disk.usage_percent}% full (${disk.used_gb}GB/${disk.total_gb}GB).`,
        recommendation:
          pressureKind === 'inode'
            ? `Find directories with many small files on ${disk.mount} and clean cache, temp, or spool files before inode exhaustion blocks writes.`
            : storageUsage > 90
              ? `Run du -sh ${disk.mount}/* | sort -rh | head -20 and clean logs or temporary files on ${disk.mount}.`
              : `Plan capacity cleanup soon before ${disk.mount} becomes critical.`
      });
    }
  }

  for (const network of snapshot.network) {
    if (!network.sample_window_seconds || network.counter_reset) {
      continue;
    }

    const errorCount =
      (network.rx_errors ?? 0) +
      (network.tx_errors ?? 0) +
      (network.rx_dropped ?? 0) +
      (network.tx_dropped ?? 0);
    const packetCount = (network.rx_packets ?? 0) + (network.tx_packets ?? 0);
    let errorRate = 0;
    if (packetCount > 0) {
      errorRate = errorCount / packetCount;
    } else if (errorCount > 0) {
      errorRate = 1;
    }

    if (errorCount > 0) {
      let severity: Anomaly['severity'] = 'low';
      if (errorCount >= 10 && errorRate >= 0.05) {
        severity = 'high';
      } else if (errorCount >= 5 && errorRate >= 0.01) {
        severity = 'medium';
      }
      anomalies.push({
        metric: `network:${network.interface}`,
        severity,
        value: errorCount,
        baseline_mean: 0,
        evidence: [
          `${errorCount} errors or drops across ${packetCount} packets during a ${network.sample_window_seconds}s sample.`,
          `Bounded packet-loss ratio ${roundTo(errorRate * 100, 2)}%.`,
          `RX/TX byte deltas ${network.rx_bytes}/${network.tx_bytes}.`
        ],
        explanation: `Interface ${network.interface} recorded ${errorCount} packet errors or drops during a ${network.sample_window_seconds}s sample (${roundTo(errorRate * 100, 2)}% of sampled packets).`,
        recommendation:
          severity === 'high'
            ? 'Inspect NIC, driver, MTU, duplex, and upstream switch counters immediately.'
            : 'Repeat the bounded sample and correlate it with application latency or packet loss symptoms.'
      });
    }
  }

  if (system.failed_units > 0) {
    anomalies.push({
      metric: 'system:failed_units',
      severity: system.failed_units >= 3 ? 'high' : 'medium',
      value: system.failed_units,
      baseline_mean: 0,
      explanation: `${system.failed_units} systemd unit${system.failed_units === 1 ? '' : 's'} are failed.`,
      recommendation:
        'Run systemctl --failed and inspect the affected unit logs before restarting services.'
    });
  }

  if (system.kernel_signal_available === true && system.kernel_error_events > 0) {
    anomalies.push({
      metric: 'system:kernel_errors',
      severity: system.kernel_error_events >= 5 ? 'high' : 'medium',
      value: system.kernel_error_events,
      baseline_mean: 0,
      explanation: `${system.kernel_error_events} kernel error event${system.kernel_error_events === 1 ? '' : 's'} were found in the last ${system.kernel_window_minutes ?? 5} minutes.`,
      recommendation:
        'Review dmesg for storage, network, OOM, or hardware errors that explain the symptom.'
    });
  }

  const normalizedLoad =
    snapshot.cpu.core_count > 0 ? snapshot.cpu.load_1 / snapshot.cpu.core_count : 0;
  if (normalizedLoad > thresholds.load_warn_ratio) {
    anomalies.push({
      metric: 'load',
      severity:
        normalizedLoad > thresholds.load_critical_ratio
          ? 'critical'
          : normalizedLoad > loadHighRatio
            ? 'high'
            : 'medium',
      value: snapshot.cpu.load_1,
      baseline_mean: baseline?.load_mean ?? snapshot.cpu.core_count,
      normalized_load_per_core: Number(normalizedLoad.toFixed(1)),
      explanation: `Load average is ${snapshot.cpu.load_1} on ${snapshot.cpu.core_count} cores (${Math.round(
        normalizedLoad * 100
      )}% of core capacity). Trend is ${snapshot.cpu.load_1} -> ${snapshot.cpu.load_5} -> ${snapshot.cpu.load_15}.`,
      recommendation:
        normalizedLoad > 2
          ? 'System load is above sustainable capacity. Check CPU saturation, runnable queue depth, and horizontal scaling options.'
          : 'Monitor the load trend and confirm whether the queue drains after the current burst.'
    });
  }

  const enrichedAnomalies = anomalies.map((anomaly) =>
    enrich(snapshot, anomaly, Boolean(baseline))
  );

  const health_score = Math.max(
    0,
    100 -
      enrichedAnomalies.filter((anomaly) => anomaly.severity === 'critical').length * 40 -
      enrichedAnomalies.filter((anomaly) => anomaly.severity === 'high').length * 20 -
      enrichedAnomalies.filter((anomaly) => anomaly.severity === 'medium').length * 10 -
      enrichedAnomalies.filter((anomaly) => anomaly.severity === 'low').length * 5
  );

  const summary =
    enrichedAnomalies.length === 0
      ? `Server ${snapshot.host} looks healthy. CPU is ${snapshot.cpu.usage_percent}%, memory is ${snapshot.memory.usage_percent}%, disk usage is within expected thresholds, and system health signals are quiet.`
      : `Found ${enrichedAnomalies.length} anomaly${enrichedAnomalies.length === 1 ? '' : 'ies'} on ${snapshot.host}. Most urgent signal: ${enrichedAnomalies[0]?.explanation ?? 'n/a'}`;

  return { anomalies: enrichedAnomalies, summary, health_score };
}
