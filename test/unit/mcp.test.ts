import { readFileSync } from 'node:fs';

import { describe, expect, it, jest } from '@jest/globals';
import type { z } from 'zod';

import {
  createToolDefinitions,
  registerInfraLensTools,
  registerToolsOnServer,
  toolDefinitions
} from '../../src/server-core.js';
import type {
  AnalyzeInput,
  AnalyzeSnapshotInput,
  BaselineInput,
  CompareIncidentWindowsInput,
  CompareInput,
  GetHistoryInput,
  IncidentReportInput,
  MetricSnapshot,
  RemediationPlanInput,
  SnapshotInput
} from '../../src/types.js';

const baseSnapshot: MetricSnapshot = {
  timestamp: Date.now(),
  host: 'app-01.internal',
  cpu: { usage_percent: 55, load_1: 1.2, load_5: 1.0, load_15: 0.8, core_count: 4 },
  memory: {
    total_mb: 8192,
    used_mb: 4096,
    free_mb: 4096,
    usage_percent: 50,
    swap_used_mb: 0,
    swap_total_mb: 1024
  },
  disk: [{ filesystem: '/dev/sda1', mount: '/', total_gb: 100, used_gb: 50, usage_percent: 50 }],
  network: [{ interface: 'eth0', rx_bytes: 123, tx_bytes: 456 }],
  system: { failed_units: 0, kernel_error_events: 0 },
  processes: [{ pid: 100, name: 'node', cpu_percent: 12, mem_percent: 5, command: 'node api.js' }],
  os: {
    hostname: 'app-01.internal',
    uptime_seconds: 3600,
    kernel: '6.8.0',
    distro: 'Ubuntu 24.04'
  },
  warnings: []
};

describe('registerInfraLensTools', () => {
  it('registers all v1 tools with required annotations', () => {
    const registered: Array<{
      name: string;
      config: {
        annotations?: {
          openWorldHint?: boolean;
        };
      };
    }> = [];

    registerInfraLensTools({
      registerTool(name: string, config: { annotations?: { openWorldHint?: boolean } }) {
        registered.push({ name, config });
      }
    });

    expect(registered.map((entry) => entry.name)).toEqual([
      'analyze_server',
      'snapshot',
      'record_baseline',
      'compare_to_baseline',
      'get_history',
      'inspect_host_capabilities',
      'plan_remediation',
      'draft_incident_report',
      'compare_incident_windows',
      'analyze_server_snapshot'
    ]);

    for (const definition of toolDefinitions) {
      expect(definition.config.annotations).toBeDefined();
      expect(definition.config.annotations?.openWorldHint).toBe(
        ['get_history', 'draft_incident_report', 'compare_incident_windows'].includes(
          definition.name
        )
          ? false
          : true
      );
    }
  });

  it('marks persistence tools as mutating and read-only tools accurately', () => {
    const definitions = createToolDefinitions();
    const readOnlyByName = Object.fromEntries(
      definitions.map((definition) => [definition.name, definition.config.annotations.readOnlyHint])
    );

    expect(readOnlyByName).toEqual({
      analyze_server: false,
      snapshot: false,
      record_baseline: false,
      compare_to_baseline: true,
      get_history: true,
      inspect_host_capabilities: true,
      plan_remediation: true,
      draft_incident_report: true,
      compare_incident_windows: true,
      analyze_server_snapshot: false
    });
  });

  it('keeps published MCP tool metadata identical to runtime registrations', () => {
    const manifest = JSON.parse(
      readFileSync(new URL('../../mcp.json', import.meta.url), 'utf8')
    ) as { tools?: Array<{ name?: string }> };

    expect(manifest.tools?.map((tool) => tool.name)).toEqual(
      createToolDefinitions().map((definition) => definition.name)
    );
  });

  it.each(['remote-safe', 'chatgpt', 'claude'] as const)(
    'removes direct SSH credential fields from tool schemas in %s profile',
    (profile) => {
      const definitions = createToolDefinitions(undefined, { profile });
      const analyzeSchema = definitions[0].config.inputSchema as z.ZodType<unknown>;
      const fastAnalyzeSchema = definitions.at(-1)!.config.inputSchema as z.ZodType<unknown>;
      const rawField = 'password';

      expect(() => {
        analyzeSchema.parse({
          connection: {
            host: 'db.internal',
            port: 22,
            username: 'ops',
            [rawField]: 'sample'
          },
          duration_minutes: 1,
          include_processes: true,
          include_network: true
        });
      }).toThrow();

      expect(() => {
        fastAnalyzeSchema.parse({
          connection: {
            host: 'db.internal',
            port: 22,
            username: 'ops',
            [rawField]: 'sample'
          },
          include_processes: true,
          include_network: true
        });
      }).toThrow();
    }
  );
  it('uses sampled collection for analyze_server and single snapshots for the other collectors', async () => {
    const collectSampled = jest.fn(async () => baseSnapshot);
    const collectSingle = jest.fn(async () => baseSnapshot);
    const persistSnapshot = jest.fn(() => undefined);

    const definitions = createToolDefinitions({
      analyzeSnapshot: jest.fn(() => ({
        anomalies: [],
        summary: 'healthy',
        health_score: 100
      })),
      collectSampledSnapshot: collectSampled,
      collectSnapshot: collectSingle,
      getBaseline: jest.fn(() => ({
        cpu_samples: [20, 21, 19],
        memory_mean: 25,
        load_mean: 0.7,
        sample_count: 3
      })),
      inspectHostCapabilities: jest.fn(async () => ({ capabilities: [], warnings: [] })),
      getHistory: jest.fn(() => []),
      saveSnapshot: persistSnapshot
    });

    await definitions[0].handler({
      connection: { host: 'app-01.internal', port: 22, username: 'ops' },
      duration_minutes: 5,
      include_processes: true,
      include_network: true
    } satisfies AnalyzeInput);

    await definitions[1].handler({
      connection: { host: 'app-01.internal', port: 22, username: 'ops' }
    } satisfies SnapshotInput);

    await definitions[2].handler({
      connection: { host: 'app-01.internal', port: 22, username: 'ops' },
      label: 'weekday-normal'
    } satisfies BaselineInput);

    await definitions[3].handler({
      connection: { host: 'app-01.internal', port: 22, username: 'ops' },
      baseline_label: 'weekday-normal'
    } satisfies CompareInput);

    await definitions[4].handler({
      host: 'app-01.internal',
      metric: 'cpu',
      hours: 24,
      label: 'weekday-normal'
    } satisfies GetHistoryInput);

    expect(collectSampled).toHaveBeenCalledTimes(1);
    expect(collectSampled).toHaveBeenCalledWith(
      { host: 'app-01.internal', port: 22, username: 'ops' },
      5,
      30,
      undefined,
      { includeNetwork: true, includeProcesses: true }
    );
    expect(collectSingle).toHaveBeenCalledTimes(3);
    expect(persistSnapshot).toHaveBeenCalledTimes(3);
    expect(persistSnapshot.mock.calls).toEqual([
      [baseSnapshot, 'default', 'observation'],
      [baseSnapshot, 'default', 'observation'],
      [baseSnapshot, 'weekday-normal', 'baseline']
    ]);
  });

  it('analyzes the current snapshot before persisting it as an observation', async () => {
    const callOrder: string[] = [];
    const definitions = createToolDefinitions({
      analyzeSnapshot: jest.fn(() => {
        callOrder.push('analyze');
        return { anomalies: [], summary: 'healthy', health_score: 100 };
      }),
      collectSampledSnapshot: jest.fn(async () => baseSnapshot),
      collectSnapshot: jest.fn(async () => baseSnapshot),
      getBaseline: jest.fn(() => null),
      inspectHostCapabilities: jest.fn(async () => ({ capabilities: [], warnings: [] })),
      getHistory: jest.fn(() => []),
      saveSnapshot: (_snapshot, _label, classification) => {
        callOrder.push(`save:${classification}`);
      }
    });

    await definitions[0].handler({
      connection: { host: 'app-01.internal', port: 22, username: 'ops' },
      duration_minutes: 1,
      include_processes: true,
      include_network: true
    } satisfies AnalyzeInput);

    expect(callOrder).toEqual(['analyze', 'save:observation']);
  });

  it('omits optional process and network sections when requested and maps all history metrics', async () => {
    const collectSampled = jest.fn(async () => baseSnapshot);
    const definitions = createToolDefinitions({
      analyzeSnapshot: jest.fn(() => ({
        anomalies: [],
        summary: 'healthy',
        health_score: 100
      })),
      collectSampledSnapshot: collectSampled,
      collectSnapshot: jest.fn(async () => baseSnapshot),
      getBaseline: jest.fn(() => null),
      inspectHostCapabilities: jest.fn(async () => ({ capabilities: [], warnings: [] })),
      getHistory: jest.fn(() => [
        {
          timestamp: 1,
          cpu_percent: 10,
          memory_percent: 20,
          load_1: 0.5,
          raw_json: '{}',
          label: 'default',
          classification: 'observation'
        }
      ]),
      saveSnapshot: jest.fn(() => undefined)
    });

    const analyzeResult = await definitions[0].handler({
      connection: { host: 'app-01.internal', port: 22, username: 'ops' },
      duration_minutes: 1,
      include_processes: false,
      include_network: false
    } satisfies AnalyzeInput);
    const memoryHistory = await definitions[4].handler({
      host: 'app-01.internal',
      metric: 'memory',
      hours: 1
    } satisfies GetHistoryInput);
    const loadHistory = await definitions[4].handler({
      host: 'app-01.internal',
      metric: 'load',
      hours: 1
    } satisfies GetHistoryInput);

    const analyzePayload = JSON.parse(analyzeResult.content[0]?.text ?? '{}') as {
      metrics?: { top_processes?: unknown[]; network?: unknown[] };
    };
    const memoryPayload = JSON.parse(memoryHistory.content[0]?.text ?? '{}') as {
      history?: Array<{ value: number }>;
    };
    const loadPayload = JSON.parse(loadHistory.content[0]?.text ?? '{}') as {
      history?: Array<{ value: number }>;
    };

    expect(analyzePayload.metrics?.top_processes).toEqual([]);
    expect(analyzePayload.metrics?.network).toEqual([]);
    expect(collectSampled).toHaveBeenCalledWith(
      { host: 'app-01.internal', port: 22, username: 'ops' },
      1,
      30,
      undefined,
      { includeNetwork: false, includeProcesses: false }
    );
    expect(memoryPayload.history?.[0]?.value).toBe(20);
    expect(loadPayload.history?.[0]?.value).toBe(0.5);
  });

  it('returns stable pagination metadata from the history dependency', async () => {
    const getHistoryPage = jest.fn(() => ({
      items: [
        {
          id: 7,
          timestamp: 10,
          cpu_percent: 42,
          memory_percent: 21,
          load_1: 0.7,
          raw_json: '{}',
          label: 'default',
          classification: 'observation' as const
        }
      ],
      has_more: true,
      next_cursor: 'next-page'
    }));
    const definitions = createToolDefinitions({
      analyzeSnapshot: jest.fn(() => ({ anomalies: [], summary: 'healthy', health_score: 100 })),
      collectSampledSnapshot: jest.fn(async () => baseSnapshot),
      collectSnapshot: jest.fn(async () => baseSnapshot),
      getBaseline: jest.fn(() => null),
      inspectHostCapabilities: jest.fn(async () => ({ capabilities: [], warnings: [] })),
      getHistory: jest.fn(() => []),
      getHistoryPage,
      saveSnapshot: jest.fn(() => undefined)
    });

    const result = await definitions[4].handler({
      host: 'app-01.internal',
      metric: 'cpu',
      hours: 24,
      limit: 1,
      cursor: 'current-page'
    } satisfies GetHistoryInput);
    const payload = JSON.parse(result.content[0]?.text ?? '{}') as {
      data_points?: number;
      has_more?: boolean;
      next_cursor?: string | null;
      history?: Array<{ value: number }>;
    };

    expect(getHistoryPage).toHaveBeenCalledWith({
      host: 'app-01.internal',
      metric: 'cpu',
      hours: 24,
      label: undefined,
      limit: 1,
      cursor: 'current-page'
    });
    expect(payload).toMatchObject({
      data_points: 1,
      has_more: true,
      next_cursor: 'next-page',
      history: [{ timestamp: 10, value: 42 }]
    });
  });

  it('returns structured content matching each declared output schema', async () => {
    const definitions = createToolDefinitions({
      analyzeSnapshot: jest.fn(() => ({
        anomalies: [],
        summary: 'healthy',
        health_score: 100
      })),
      collectSampledSnapshot: jest.fn(async () => baseSnapshot),
      collectSnapshot: jest.fn(async () => baseSnapshot),
      getBaseline: jest.fn(() => ({
        cpu_samples: [20, 21, 19],
        memory_mean: 25,
        load_mean: 0.7,
        sample_count: 3
      })),
      inspectHostCapabilities: jest.fn(async () => ({ capabilities: [], warnings: [] })),
      getHistory: jest.fn(() => [
        {
          timestamp: 1,
          cpu_percent: 10,
          memory_percent: 20,
          load_1: 0.5,
          raw_json: '{}',
          label: 'default',
          classification: 'observation'
        }
      ]),
      getObservationWindow: jest.fn(() => ({
        snapshots: [baseSnapshot],
        invalidRows: 0,
        truncated: false
      })),
      saveSnapshot: jest.fn(() => undefined)
    });

    const analyzeResult = await definitions[0].handler({
      connection: { host: 'app-01.internal', port: 22, username: 'ops' },
      duration_minutes: 1,
      include_processes: true,
      include_network: true
    } satisfies AnalyzeInput);
    const snapshotResult = await definitions[1].handler({
      connection: { host: 'app-01.internal', port: 22, username: 'ops' }
    } satisfies SnapshotInput);
    const baselineResult = await definitions[2].handler({
      connection: { host: 'app-01.internal', port: 22, username: 'ops' },
      label: 'weekday-normal'
    } satisfies BaselineInput);
    const compareResult = await definitions[3].handler({
      connection: { host: 'app-01.internal', port: 22, username: 'ops' },
      baseline_label: 'weekday-normal'
    } satisfies CompareInput);
    const historyResult = await definitions[4].handler({
      host: 'app-01.internal',
      metric: 'cpu',
      hours: 24,
      label: 'weekday-normal'
    } satisfies GetHistoryInput);
    const capabilitiesResult = await definitions[5].handler({
      connection: { host: 'app-01.internal', port: 22, username: 'ops' }
    });
    const remediationResult = await definitions[6].handler({
      connection: { host: 'app-01.internal', port: 22, username: 'ops' }
    } satisfies RemediationPlanInput);
    const reportResult = await definitions[7].handler({
      host: 'app-01.internal',
      hours: 24,
      limit: 20
    } satisfies IncidentReportInput);
    const windowComparisonResult = await definitions[8].handler({
      host: 'app-01.internal',
      recent_hours: 1,
      limit: 20
    } satisfies CompareIncidentWindowsInput);
    const fastAnalyzeResult = await definitions[9].handler({
      connection: { host: 'app-01.internal', port: 22, username: 'ops' },
      include_processes: true,
      include_network: true
    } satisfies AnalyzeSnapshotInput);

    const results = [
      analyzeResult,
      snapshotResult,
      baselineResult,
      compareResult,
      historyResult,
      capabilitiesResult,
      remediationResult,
      reportResult,
      windowComparisonResult,
      fastAnalyzeResult
    ];

    definitions.forEach((definition, index) => {
      const result = results[index]!;
      const jsonTextPayload = JSON.parse(result.content[0]?.text ?? '{}') as unknown;
      expect(definition.config.outputSchema).toBeDefined();
      expect(result.structuredContent).toEqual(jsonTextPayload);
      expect(() => {
        (definition.config.outputSchema as z.ZodType<unknown>).parse(result.structuredContent);
      }).not.toThrow();
    });
  });

  it('registers wrappers on an MCP server compatible registrar', async () => {
    const handlerSpy = jest.fn(() => ({
      anomalies: [],
      summary: 'healthy',
      health_score: 100
    }));
    const server = {
      registered: [] as Array<{ name: string; handler: (input: unknown) => Promise<unknown> }>,
      registerTool(name: string, _config: unknown, handler: (input: unknown) => Promise<unknown>) {
        this.registered.push({ name, handler });
      }
    };

    registerToolsOnServer(server as never, {
      analyzeSnapshot: handlerSpy,
      collectSampledSnapshot: jest.fn(async () => baseSnapshot),
      collectSnapshot: jest.fn(async () => baseSnapshot),
      getBaseline: jest.fn(() => null),
      inspectHostCapabilities: jest.fn(async () => ({ capabilities: [], warnings: [] })),
      getHistory: jest.fn(() => []),
      saveSnapshot: jest.fn(() => undefined)
    });

    expect(server.registered).toHaveLength(10);

    await server.registered[0]!.handler({
      connection: { host: 'app-01.internal', port: 22, username: 'ops' },
      duration_minutes: 1,
      include_processes: true,
      include_network: true
    });

    expect(handlerSpy).toHaveBeenCalledWith(baseSnapshot);
  });
});
