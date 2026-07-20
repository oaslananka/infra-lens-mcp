import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AnySchema } from '@modelcontextprotocol/sdk/server/zod-compat.js';

import { analyzeSnapshot } from './analyzer.js';
import { getBaseline, getHistory, getHistoryPage, saveSnapshot } from './baseline.js';
import { collectSampledSnapshot, collectSnapshot, inspectHostCapabilities } from './collector.js';
import {
  AnalyzeOutputSchema,
  AnalyzeSchema,
  BaselineOutputSchema,
  BaselineSchema,
  CapabilitySchema,
  CompareOutputSchema,
  CompareSchema,
  GetHistoryOutputSchema,
  GetHistorySchema,
  InspectCapabilitiesOutputSchema,
  SafeConnectionSchema,
  SnapshotOutputSchema,
  SnapshotSchema,
  type AnalyzeInput,
  type BaselineInput,
  type CapabilityInput,
  type CompareInput,
  type GetHistoryInput,
  type RuntimeProfile,
  type SnapshotInput
} from './types.js';

/** Content returned from an MCP tool handler. */
export type ToolContent = {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
};

/** Async handler invoked for a registered MCP tool. */
export type ToolHandler<Input> = (input: Input) => Promise<ToolContent>;

/** MCP tool registration metadata and input schema. */
export type ToolConfig = {
  title: string;
  description: string;
  inputSchema: AnySchema;
  outputSchema: AnySchema;
  annotations: {
    readOnlyHint: boolean;
    destructiveHint: boolean;
    openWorldHint: boolean;
  };
};

/** Complete MCP tool definition before registration with a server. */
export interface ToolDefinition<Input> {
  name: string;
  config: ToolConfig;
  handler: ToolHandler<Input>;
}

/** Ordered tuple of the built-in infra lens MCP tools. */
export type ToolDefinitionTuple = [
  ToolDefinition<AnalyzeInput>,
  ToolDefinition<SnapshotInput>,
  ToolDefinition<BaselineInput>,
  ToolDefinition<CompareInput>,
  ToolDefinition<GetHistoryInput>,
  ToolDefinition<CapabilityInput>
];

export interface ToolRegistrar {
  registerTool<Input>(name: string, config: ToolConfig, handler: ToolHandler<Input>): void;
}

export interface ToolDependencies {
  analyzeSnapshot: typeof analyzeSnapshot;
  collectSampledSnapshot: typeof collectSampledSnapshot;
  collectSnapshot: typeof collectSnapshot;
  inspectHostCapabilities: typeof inspectHostCapabilities;
  getBaseline: typeof getBaseline;
  getHistory: typeof getHistory;
  getHistoryPage?: typeof getHistoryPage;
  saveSnapshot: typeof saveSnapshot;
}

export interface ToolDefinitionOptions {
  profile?: RuntimeProfile;
}

const defaultDependencies: ToolDependencies = {
  analyzeSnapshot,
  collectSampledSnapshot,
  collectSnapshot,
  inspectHostCapabilities,
  getBaseline,
  getHistory,
  getHistoryPage,
  saveSnapshot
};

function structuredResult<T extends Record<string, unknown>>(payload: T): ToolContent {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload, null, 2)
      }
    ],
    structuredContent: payload
  };
}

function buildHistory(input: GetHistoryInput, dependencies: ToolDependencies) {
  const page = dependencies.getHistoryPage
    ? dependencies.getHistoryPage({
        host: input.host,
        metric: input.metric,
        hours: input.hours,
        label: input.label,
        limit: input.limit ?? 100,
        cursor: input.cursor
      })
    : {
        items: dependencies
          .getHistory(input.host, input.metric, input.hours, input.label)
          .slice(0, input.limit ?? 100),
        has_more: false,
        next_cursor: null
      };

  return {
    ...page,
    history: page.items.map((row) => ({
      timestamp: row.timestamp,
      value:
        input.metric === 'cpu'
          ? row.cpu_percent
          : input.metric === 'memory'
            ? row.memory_percent
            : row.load_1
    }))
  };
}

function isRemoteSafeProfile(profile: RuntimeProfile): boolean {
  return profile === 'remote-safe' || profile === 'chatgpt' || profile === 'claude';
}

function getProfileFromEnv(): RuntimeProfile {
  const profile = process.env.MCP_PROFILE;

  return profile === 'remote-safe' || profile === 'chatgpt' || profile === 'claude'
    ? profile
    : 'full';
}

function createSchemas(profile: RuntimeProfile) {
  const connectionSchema = isRemoteSafeProfile(profile) ? SafeConnectionSchema : undefined;

  if (!connectionSchema) {
    return {
      analyze: AnalyzeSchema,
      snapshot: SnapshotSchema,
      baseline: BaselineSchema,
      compare: CompareSchema,
      capabilities: CapabilitySchema
    };
  }

  return {
    analyze: AnalyzeSchema.extend({ connection: connectionSchema }),
    snapshot: SnapshotSchema.extend({ connection: connectionSchema }),
    baseline: BaselineSchema.extend({ connection: connectionSchema }),
    compare: CompareSchema.extend({ connection: connectionSchema }),
    capabilities: CapabilitySchema.extend({ connection: connectionSchema })
  };
}

export function createToolDefinitions(
  dependencies: ToolDependencies = defaultDependencies,
  options: ToolDefinitionOptions = {}
): ToolDefinitionTuple {
  const profile = options.profile ?? getProfileFromEnv();
  const schemas = createSchemas(profile);

  return [
    {
      name: 'analyze_server',
      config: {
        title: 'Analyze Server',
        description: 'Collect metrics from a server and explain any anomalies in human language',
        inputSchema: schemas.analyze,
        outputSchema: AnalyzeOutputSchema,
        annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true }
      },
      handler: async (input) => {
        const collectionOptions = {
          includeProcesses: input.include_processes,
          includeNetwork: input.include_network
        };
        const snapshot = await dependencies.collectSampledSnapshot(
          input.connection,
          input.duration_minutes,
          30,
          undefined,
          collectionOptions
        );
        const analysis = dependencies.analyzeSnapshot(snapshot);
        dependencies.saveSnapshot(snapshot, 'default', 'observation');
        return structuredResult({
          host: snapshot.host,
          timestamp: new Date(snapshot.timestamp).toISOString(),
          collection_window_minutes: input.duration_minutes,
          health_score: analysis.health_score,
          summary: analysis.summary,
          anomalies: analysis.anomalies,
          metrics: {
            cpu: snapshot.cpu,
            memory: snapshot.memory,
            disk: snapshot.disk,
            top_processes: input.include_processes ? snapshot.processes.slice(0, 5) : [],
            network: input.include_network ? snapshot.network : [],
            system: snapshot.system
          },
          warnings: snapshot.warnings
        });
      }
    },
    {
      name: 'snapshot',
      config: {
        title: 'Take Metric Snapshot',
        description: 'Collect and save current server metrics without analysis',
        inputSchema: schemas.snapshot,
        outputSchema: SnapshotOutputSchema,
        annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true }
      },
      handler: async (input) => {
        const snapshot = await dependencies.collectSnapshot(input.connection);
        dependencies.saveSnapshot(snapshot, 'default', 'observation');
        return structuredResult({
          saved: true,
          host: snapshot.host,
          timestamp: snapshot.timestamp,
          warnings: snapshot.warnings
        });
      }
    },
    {
      name: 'record_baseline',
      config: {
        title: 'Record Baseline',
        description:
          'Record current metrics as baseline during normal operation for more accurate anomaly detection later',
        inputSchema: schemas.baseline,
        outputSchema: BaselineOutputSchema,
        annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true }
      },
      handler: async (input) => {
        const snapshot = await dependencies.collectSnapshot(input.connection);
        dependencies.saveSnapshot(snapshot, input.label, 'baseline');
        const baseline = dependencies.getBaseline(snapshot.host, input.label);
        const sampleCount = baseline?.sample_count ?? 1;
        const samplesRemaining = Math.max(0, 10 - sampleCount);

        return structuredResult({
          saved: true,
          host: snapshot.host,
          label: input.label,
          sample_count: sampleCount,
          message:
            sampleCount >= 10
              ? `Baseline established with ${sampleCount} samples.`
              : `Recorded baseline sample. ${samplesRemaining} more sample(s) recommended for reliable anomaly detection.`,
          warnings: snapshot.warnings
        });
      }
    },
    {
      name: 'compare_to_baseline',
      config: {
        title: 'Compare to Baseline',
        description:
          'Compare current server state to a recorded baseline and explain the differences',
        inputSchema: schemas.compare,
        outputSchema: CompareOutputSchema,
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true }
      },
      handler: async (input) => {
        const snapshot = await dependencies.collectSnapshot(input.connection);
        const baseline = dependencies.getBaseline(snapshot.host, input.baseline_label);
        const analysis = dependencies.analyzeSnapshot(snapshot, input.baseline_label);
        return structuredResult({
          host: snapshot.host,
          baseline_label: input.baseline_label,
          baseline_samples: baseline?.sample_count ?? 0,
          health_score: analysis.health_score,
          summary: analysis.summary,
          anomalies: analysis.anomalies,
          warnings: snapshot.warnings
        });
      }
    },
    {
      name: 'get_history',
      config: {
        title: 'Get Metric History',
        description: 'Get historical CPU, memory, or load values for a server',
        inputSchema: GetHistorySchema,
        outputSchema: GetHistoryOutputSchema,
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
      },
      handler: async (input) => {
        const page = buildHistory(input, dependencies);
        return structuredResult({
          host: input.host,
          metric: input.metric,
          hours: input.hours,
          label: input.label ?? null,
          data_points: page.history.length,
          has_more: page.has_more,
          next_cursor: page.next_cursor,
          history: page.history
        });
      }
    },
    {
      name: 'inspect_host_capabilities',
      config: {
        title: 'Inspect Host Capabilities',
        description: 'Check whether a Linux host supports infra-lens collection',
        inputSchema: schemas.capabilities,
        outputSchema: InspectCapabilitiesOutputSchema,
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true }
      },
      handler: async (input) => {
        const inspection = await dependencies.inspectHostCapabilities(input.connection);
        return structuredResult({
          host: input.connection.host,
          checked_at: new Date().toISOString(),
          capabilities: inspection.capabilities,
          warnings: inspection.warnings
        });
      }
    }
  ];
}

export const toolDefinitions = createToolDefinitions() as ReadonlyArray<ToolDefinition<unknown>>;

export function registerInfraLensTools(
  registrar: ToolRegistrar,
  dependencies: ToolDependencies = defaultDependencies,
  options: ToolDefinitionOptions = {}
): void {
  for (const definition of createToolDefinitions(dependencies, options)) {
    registrar.registerTool(
      definition.name,
      definition.config,
      definition.handler as ToolHandler<unknown>
    );
  }
}

export function registerToolsOnServer(
  server: McpServer,
  dependencies: ToolDependencies = defaultDependencies,
  options: ToolDefinitionOptions = {}
): void {
  registerInfraLensTools(
    {
      registerTool(name, config, handler) {
        server.registerTool(name, config, (input: unknown) => handler(input as never));
      }
    },
    dependencies,
    options
  );
}
