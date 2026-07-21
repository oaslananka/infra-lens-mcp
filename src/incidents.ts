import type { Anomaly, MetricSnapshot } from './types.js';

export interface SnapshotAnalysis {
  anomalies: Anomaly[];
  summary: string;
  health_score: number;
}

export interface RemediationStep {
  id: string;
  priority: Anomaly['severity'];
  metric: string;
  title: string;
  proposed_action: string;
  rationale: string;
  evidence: string[];
  confidence: number;
  verification: string[];
  rollback_guidance: string;
  requires_approval: true;
}

export interface RemediationPlan {
  host: string;
  generated_at: string;
  health_score: number;
  summary: string;
  confidence: number;
  review_required: true;
  execution_performed: false;
  steps: RemediationStep[];
}

export interface IncidentWindowSummary {
  host: string;
  sample_count: number;
  from: number | null;
  to: number | null;
  cpu: { average: number; maximum: number };
  memory: { average: number; maximum: number };
  load: { average: number; maximum: number };
}

export interface WindowMetricComparison {
  metric: 'cpu_percent' | 'memory_percent' | 'load_1';
  left: number;
  right: number;
  delta: number;
  direction: 'increased' | 'decreased' | 'stable';
}

export interface IncidentWindowComparison {
  left_label: string;
  right_label: string;
  left: IncidentWindowSummary;
  right: IncidentWindowSummary;
  metrics: WindowMetricComparison[];
  summary: string;
  review_required: true;
}

export interface IncidentTimelineEntry {
  kind: 'first_observation' | 'peak_cpu' | 'peak_memory' | 'latest_observation';
  timestamp: number;
  detail: string;
}

export interface IncidentReportDraft {
  status: 'draft';
  review_required: true;
  host: string;
  generated_at: string;
  window: { from: number; to: number };
  sample_count: number;
  invalid_rows: number;
  completeness: 'complete' | 'partial' | 'incomplete';
  executive_summary: string;
  impact_signals: string[];
  detection_evidence: string[];
  timeline: IncidentTimelineEntry[];
  remediation: RemediationPlan;
  postmortem: {
    contributing_factors: string[];
    what_went_well: string[];
    improvement_actions: string[];
    open_questions: string[];
  };
}

const severityOrder: Record<Anomaly['severity'], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function confidenceFor(anomaly: Anomaly): number {
  return (
    anomaly.confidence ??
    (anomaly.severity === 'critical'
      ? 0.9
      : anomaly.severity === 'high'
        ? 0.8
        : anomaly.severity === 'medium'
          ? 0.7
          : 0.6)
  );
}

export function buildRemediationPlan(
  snapshot: MetricSnapshot,
  analysis: SnapshotAnalysis,
  now = Date.now()
): RemediationPlan {
  const anomalies = [...analysis.anomalies].sort(
    (left, right) => severityOrder[right.severity] - severityOrder[left.severity]
  );
  const steps = anomalies.map<RemediationStep>((anomaly, index) => ({
    id: `step-${index + 1}`,
    priority: anomaly.severity,
    metric: anomaly.metric,
    title: `Review ${anomaly.metric} remediation`,
    proposed_action: anomaly.recommendation,
    rationale: anomaly.root_cause_hypothesis ?? anomaly.explanation,
    evidence: anomaly.evidence ?? [anomaly.explanation],
    confidence: confidenceFor(anomaly),
    verification: anomaly.suggested_next_checks ?? [
      'Collect another snapshot and confirm recovery.'
    ],
    rollback_guidance:
      'Apply only operator-approved changes. If verification worsens or introduces new symptoms, revert the approved change using the service owner runbook.',
    requires_approval: true
  }));
  const confidence = steps.length === 0 ? 1 : round(mean(steps.map((step) => step.confidence)), 2);
  return {
    host: snapshot.host,
    generated_at: new Date(now).toISOString(),
    health_score: analysis.health_score,
    summary:
      steps.length === 0
        ? 'No remediation is proposed because the latest analysis found no anomalies.'
        : `${steps.length} review-first remediation step${steps.length === 1 ? '' : 's'} proposed. No action was executed.`,
    confidence,
    review_required: true,
    execution_performed: false,
    steps
  };
}

export function summarizeIncidentWindow(snapshots: MetricSnapshot[]): IncidentWindowSummary {
  const sorted = [...snapshots].sort((left, right) => left.timestamp - right.timestamp);
  const cpu = sorted.map((snapshot) => snapshot.cpu.usage_percent);
  const memory = sorted.map((snapshot) => snapshot.memory.usage_percent);
  const load = sorted.map((snapshot) => snapshot.cpu.load_1);
  return {
    host: sorted[0]?.host ?? '',
    sample_count: sorted.length,
    from: sorted[0]?.timestamp ?? null,
    to: sorted.at(-1)?.timestamp ?? null,
    cpu: { average: round(mean(cpu)), maximum: cpu.length ? Math.max(...cpu) : 0 },
    memory: { average: round(mean(memory)), maximum: memory.length ? Math.max(...memory) : 0 },
    load: { average: round(mean(load)), maximum: load.length ? Math.max(...load) : 0 }
  };
}

function compareMetric(
  metric: WindowMetricComparison['metric'],
  left: number,
  right: number
): WindowMetricComparison {
  const delta = round(right - left);
  return {
    metric,
    left,
    right,
    delta,
    direction: Math.abs(delta) < 0.1 ? 'stable' : delta > 0 ? 'increased' : 'decreased'
  };
}

export function compareIncidentWindows(
  leftLabel: string,
  left: IncidentWindowSummary,
  rightLabel: string,
  right: IncidentWindowSummary
): IncidentWindowComparison {
  const metrics = [
    compareMetric('cpu_percent', left.cpu.average, right.cpu.average),
    compareMetric('memory_percent', left.memory.average, right.memory.average),
    compareMetric('load_1', left.load.average, right.load.average)
  ];
  const changed = metrics.filter((metric) => metric.direction !== 'stable');
  return {
    left_label: leftLabel,
    right_label: rightLabel,
    left,
    right,
    metrics,
    summary:
      changed.length === 0
        ? `${leftLabel} and ${rightLabel} have stable average CPU, memory, and load.`
        : `${changed.length} of 3 average signals changed between ${leftLabel} and ${rightLabel}.`,
    review_required: true
  };
}

function unique(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function buildTimeline(snapshots: MetricSnapshot[]): IncidentTimelineEntry[] {
  if (snapshots.length === 0) return [];
  const sorted = [...snapshots].sort((left, right) => left.timestamp - right.timestamp);
  const first = sorted[0]!;
  const latest = sorted.at(-1)!;
  const peakCpu = [...sorted].sort(
    (left, right) => right.cpu.usage_percent - left.cpu.usage_percent
  )[0]!;
  const peakMemory = [...sorted].sort(
    (left, right) => right.memory.usage_percent - left.memory.usage_percent
  )[0]!;
  const entries: IncidentTimelineEntry[] = [
    {
      kind: 'first_observation',
      timestamp: first.timestamp,
      detail: `First persisted observation: CPU ${first.cpu.usage_percent}%, memory ${first.memory.usage_percent}%.`
    },
    {
      kind: 'peak_cpu',
      timestamp: peakCpu.timestamp,
      detail: `Peak CPU ${peakCpu.cpu.usage_percent}%.`
    },
    {
      kind: 'peak_memory',
      timestamp: peakMemory.timestamp,
      detail: `Peak memory ${peakMemory.memory.usage_percent}%.`
    },
    {
      kind: 'latest_observation',
      timestamp: latest.timestamp,
      detail: `Latest persisted observation: CPU ${latest.cpu.usage_percent}%, memory ${latest.memory.usage_percent}%.`
    }
  ];
  return entries.filter(
    (entry, index) =>
      entries.findIndex(
        (candidate) => candidate.kind === entry.kind && candidate.timestamp === entry.timestamp
      ) === index
  );
}

export interface IncidentReportDraftOptions {
  snapshots: MetricSnapshot[];
  invalidRows: number;
  analysis: SnapshotAnalysis | null;
  now?: number;
  windowFrom: number;
  windowTo: number;
  host?: string;
}

export function buildIncidentReportDraft(options: IncidentReportDraftOptions): IncidentReportDraft {
  const sorted = [...options.snapshots].sort((left, right) => left.timestamp - right.timestamp);
  const latest = sorted.at(-1);
  const host = latest?.host ?? options.host ?? '';
  const analysis = options.analysis;
  const emptyPlan: RemediationPlan = {
    host,
    generated_at: new Date(options.now ?? Date.now()).toISOString(),
    health_score: 0,
    summary: 'No remediation is proposed because no persisted observation was available.',
    confidence: 0,
    review_required: true,
    execution_performed: false,
    steps: []
  };
  const remediation =
    latest && analysis ? buildRemediationPlan(latest, analysis, options.now) : emptyPlan;
  const impactSignals = analysis?.anomalies.map((anomaly) => anomaly.explanation) ?? [];
  const evidence =
    analysis?.anomalies.flatMap((anomaly) => anomaly.evidence ?? [anomaly.explanation]) ?? [];
  const contributingFactors = unique(
    analysis?.anomalies.map((anomaly) => anomaly.root_cause_hypothesis) ?? []
  );
  const openQuestions = [
    ...(sorted.length === 0 ? ['No persisted observations were available for this window.'] : []),
    'Which deployment, traffic, or dependency change preceded the first observed symptom?',
    'What user or service impact occurred outside the collected infrastructure signals?'
  ];
  return {
    status: 'draft',
    review_required: true,
    host,
    generated_at: new Date(options.now ?? Date.now()).toISOString(),
    window: { from: options.windowFrom, to: options.windowTo },
    sample_count: sorted.length,
    invalid_rows: options.invalidRows,
    completeness:
      sorted.length === 0
        ? 'incomplete'
        : options.invalidRows > 0 || !analysis
          ? 'partial'
          : 'complete',
    executive_summary:
      analysis?.summary ??
      `No valid persisted observations were available for ${host || 'the host'}.`,
    impact_signals: impactSignals,
    detection_evidence: evidence,
    timeline: buildTimeline(sorted),
    remediation,
    postmortem: {
      contributing_factors: contributingFactors,
      what_went_well: [
        sorted.length > 0
          ? `${sorted.length} persisted observation${sorted.length === 1 ? '' : 's'} were available for review.`
          : 'The report explicitly records the absence of persisted evidence.'
      ],
      improvement_actions: remediation.steps.map((step) => step.proposed_action),
      open_questions: openQuestions
    }
  };
}
