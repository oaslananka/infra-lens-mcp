import { describe, expect, it } from '@jest/globals';

import {
  buildIncidentReportDraft,
  buildRemediationPlan,
  compareIncidentWindows,
  summarizeIncidentWindow
} from '../../src/incidents.js';
import type { MetricSnapshot } from '../../src/types.js';

const snapshot = (
  timestamp: number,
  host: string,
  cpu: number,
  memory = 50,
  load = 1
): MetricSnapshot => ({
  timestamp,
  host,
  cpu: { usage_percent: cpu, load_1: load, load_5: load, load_15: load, core_count: 4 },
  memory: {
    total_mb: 8192,
    used_mb: (8192 * memory) / 100,
    free_mb: 8192 - (8192 * memory) / 100,
    usage_percent: memory,
    swap_used_mb: 0,
    swap_total_mb: 1024
  },
  disk: [{ filesystem: '/dev/sda1', mount: '/', total_gb: 100, used_gb: 82, usage_percent: 82 }],
  network: [],
  system: { failed_units: 0, kernel_error_events: 0 },
  processes: [
    { pid: 1, name: 'node', cpu_percent: cpu - 5, mem_percent: 10, command: 'node api.js' }
  ],
  os: { hostname: host, uptime_seconds: 1000, kernel: 'x', distro: 'x' },
  warnings: []
});

const analysis = {
  health_score: 60,
  summary: 'CPU and disk pressure detected.',
  anomalies: [
    {
      metric: 'cpu',
      severity: 'high' as const,
      value: 92,
      baseline_mean: 25,
      confidence: 0.91,
      root_cause_hypothesis: 'node api.js is the most likely CPU pressure driver.',
      evidence: ['CPU 92% vs baseline 25%.', 'Top CPU process node api.js.'],
      suggested_next_checks: ['Inspect application logs.', 'Correlate with deploys.'],
      explanation: 'CPU is high.',
      recommendation: 'Scale or tune the API after operator review.'
    },
    {
      metric: 'disk:/',
      severity: 'medium' as const,
      value: 82,
      baseline_mean: 0,
      confidence: 0.7,
      evidence: ['Disk / is 82% full.'],
      suggested_next_checks: ['Inspect retention paths.'],
      explanation: 'Disk is filling.',
      recommendation: 'Plan cleanup or capacity expansion.'
    }
  ]
};

describe('incident artifact builders', () => {
  it('builds ordered approval-required remediation steps with evidence and confidence', () => {
    const plan = buildRemediationPlan(snapshot(1000, 'app-01', 92), analysis, 2000);

    expect(plan).toMatchObject({
      host: 'app-01',
      generated_at: new Date(2000).toISOString(),
      review_required: true,
      health_score: 60,
      confidence: 0.81
    });
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0]).toMatchObject({
      priority: 'high',
      metric: 'cpu',
      requires_approval: true,
      proposed_action: 'Scale or tune the API after operator review.',
      confidence: 0.91
    });
    expect(plan.steps[0]?.evidence).toContain('CPU 92% vs baseline 25%.');
    expect(plan.steps[0]?.verification).toEqual([
      'Inspect application logs.',
      'Correlate with deploys.'
    ]);
    expect(plan.execution_performed).toBe(false);
    expect(plan.steps.every((step) => !('command' in step))).toBe(true);
  });

  it('returns a healthy review artifact without inventing remediation', () => {
    const plan = buildRemediationPlan(
      snapshot(1000, 'app-01', 20),
      { health_score: 100, summary: 'healthy', anomalies: [] },
      2000
    );

    expect(plan.steps).toEqual([]);
    expect(plan.summary).toContain('No remediation');
    expect(plan.confidence).toBe(1);
  });

  it('summarizes windows with averages and maxima', () => {
    const summary = summarizeIncidentWindow([
      snapshot(1000, 'app-01', 20, 40, 1),
      snapshot(2000, 'app-01', 80, 60, 3)
    ]);

    expect(summary).toMatchObject({
      host: 'app-01',
      sample_count: 2,
      from: 1000,
      to: 2000,
      cpu: { average: 50, maximum: 80 },
      memory: { average: 50, maximum: 60 },
      load: { average: 2, maximum: 3 }
    });
  });

  it('compares windows and reports directional deltas', () => {
    const comparison = compareIncidentWindows(
      'previous',
      summarizeIncidentWindow([snapshot(1000, 'app-01', 20, 40, 1)]),
      'recent',
      summarizeIncidentWindow([snapshot(2000, 'app-01', 70, 60, 2)])
    );

    expect(comparison.metrics).toEqual(
      expect.arrayContaining([
        {
          metric: 'cpu_percent',
          left: 20,
          right: 70,
          delta: 50,
          direction: 'increased'
        },
        {
          metric: 'memory_percent',
          left: 40,
          right: 60,
          delta: 20,
          direction: 'increased'
        }
      ])
    );
    expect(comparison.review_required).toBe(true);
  });

  it('builds a factual incident and postmortem draft from persisted evidence', () => {
    const snapshots = [snapshot(1000, 'app-01', 30, 40, 1), snapshot(2000, 'app-01', 92, 70, 4)];
    const report = buildIncidentReportDraft({
      snapshots,
      invalidRows: 1,
      analysis,
      now: 3000,
      windowFrom: 500,
      windowTo: 2500
    });

    expect(report).toMatchObject({
      status: 'draft',
      review_required: true,
      host: 'app-01',
      sample_count: 2,
      invalid_rows: 1,
      completeness: 'partial'
    });
    expect(report.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'first_observation', timestamp: 1000 }),
        expect.objectContaining({ kind: 'latest_observation', timestamp: 2000 })
      ])
    );
    expect(report.impact_signals).toContain('CPU is high.');
    expect(report.postmortem.contributing_factors).toContain(
      'node api.js is the most likely CPU pressure driver.'
    );
    expect(report.postmortem.open_questions.length).toBeGreaterThan(0);
    expect(report.remediation.steps.every((step) => step.requires_approval)).toBe(true);
  });

  it('returns an explicitly incomplete empty-window draft', () => {
    const report = buildIncidentReportDraft({
      snapshots: [],
      invalidRows: 0,
      analysis: null,
      now: 3000,
      windowFrom: 1000,
      windowTo: 2000,
      host: 'empty-host'
    });

    expect(report.completeness).toBe('incomplete');
    expect(report.sample_count).toBe(0);
    expect(report.impact_signals).toEqual([]);
    expect(report.postmortem.open_questions).toContain(
      'No persisted observations were available for this window.'
    );
  });
});
