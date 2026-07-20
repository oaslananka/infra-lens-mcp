import { z } from 'zod';

export const ConnectionSchema = z.object({
  host: z.string().describe('Server hostname or IP'),
  port: z.number().int().default(22).describe('SSH port'),
  username: z.string().describe('SSH username'),
  password: z.string().optional().describe('SSH password'),
  privateKey: z.string().optional().describe('SSH private key content'),
  passphrase: z.string().optional().describe('Private key passphrase'),
  hostKeySha256: z
    .string()
    .optional()
    .describe('Pinned SSH host key fingerprint, with or without SHA256: prefix'),
  knownHostsPath: z
    .string()
    .optional()
    .describe('Path to an OpenSSH known_hosts file used for strict host key verification')
});

export const SafeConnectionSchema = ConnectionSchema.omit({
  password: true,
  privateKey: true,
  passphrase: true
}).strict();

export const AnalyzeSchema = z.object({
  connection: ConnectionSchema,
  duration_minutes: z
    .number()
    .int()
    .min(1)
    .max(60)
    .default(5)
    .describe('How many minutes of metrics to collect for analysis'),
  include_processes: z.boolean().default(true).describe('Include top process analysis'),
  include_network: z.boolean().default(true).describe('Include network metrics')
});

export const SnapshotSchema = z.object({
  connection: ConnectionSchema
});

export const CapabilitySchema = z.object({
  connection: ConnectionSchema
});

export const BaselineSchema = z.object({
  connection: ConnectionSchema,
  label: z
    .string()
    .default('default')
    .describe('Label for this baseline (e.g. "normal", "peak-hours")')
});

export const CompareSchema = z.object({
  connection: ConnectionSchema,
  baseline_label: z.string().default('default')
});

export const MetricNameSchema = z.enum(['cpu', 'memory', 'load']);

export const GetHistorySchema = z.object({
  host: z.string().describe('Server hostname or IP'),
  metric: MetricNameSchema.default('cpu').describe('Metric to return from historical snapshots'),
  hours: z
    .number()
    .int()
    .min(1)
    .max(168)
    .default(24)
    .describe('How many hours of history to return'),
  label: z
    .string()
    .optional()
    .describe('Optional label filter; omitted returns observations, set returns matching records')
});

export const DiskMetricSchema = z.object({
  filesystem: z.string(),
  mount: z.string(),
  total_gb: z.number(),
  used_gb: z.number(),
  usage_percent: z.number(),
  inode_total: z.number().optional(),
  inode_used: z.number().optional(),
  inode_usage_percent: z.number().optional()
});

export const NetworkMetricSchema = z.object({
  interface: z.string(),
  rx_bytes: z.number(),
  tx_bytes: z.number(),
  rx_packets: z.number().optional(),
  tx_packets: z.number().optional(),
  rx_errors: z.number().optional(),
  tx_errors: z.number().optional(),
  rx_dropped: z.number().optional(),
  tx_dropped: z.number().optional(),
  sample_window_seconds: z.number().positive().optional(),
  counter_reset: z.boolean().optional()
});

export const SystemMetricSchema = z.object({
  failed_units: z.number().int().min(0),
  kernel_error_events: z.number().int().min(0),
  kernel_signal_available: z.boolean().optional(),
  kernel_window_minutes: z.number().int().positive().optional()
});

export const ProcessMetricSchema = z.object({
  pid: z.number().int(),
  name: z.string(),
  cpu_percent: z.number(),
  mem_percent: z.number(),
  command: z.string()
});

export const CpuMetricSchema = z.object({
  usage_percent: z.number(),
  load_1: z.number(),
  load_5: z.number(),
  load_15: z.number(),
  core_count: z.number().int()
});

export const MemoryMetricSchema = z.object({
  total_mb: z.number(),
  used_mb: z.number(),
  free_mb: z.number(),
  usage_percent: z.number(),
  swap_used_mb: z.number(),
  swap_total_mb: z.number()
});

export const AnomalySchema = z.object({
  metric: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  value: z.number(),
  baseline_mean: z.number(),
  z_score: z.number().optional(),
  robust_z_score: z.number().optional(),
  baseline_median: z.number().optional(),
  normalized_load_per_core: z.number().optional(),
  confidence: z.number().min(0).max(1).optional(),
  root_cause_hypothesis: z.string().optional(),
  evidence: z.array(z.string()).optional(),
  suggested_next_checks: z.array(z.string()).optional(),
  explanation: z.string(),
  recommendation: z.string()
});

export const HostCapabilitySchema = z.object({
  name: z.string(),
  available: z.boolean(),
  source: z.string(),
  detail: z.string().optional()
});

export const AnalyzeOutputSchema = z.object({
  host: z.string(),
  timestamp: z.string(),
  collection_window_minutes: z.number().int().min(1),
  health_score: z.number().min(0).max(100),
  summary: z.string(),
  anomalies: z.array(AnomalySchema),
  metrics: z.object({
    cpu: CpuMetricSchema,
    memory: MemoryMetricSchema,
    disk: z.array(DiskMetricSchema),
    top_processes: z.array(ProcessMetricSchema),
    network: z.array(NetworkMetricSchema),
    system: SystemMetricSchema
  }),
  warnings: z.array(z.string())
});

export const SnapshotOutputSchema = z.object({
  saved: z.boolean(),
  host: z.string(),
  timestamp: z.number().int(),
  warnings: z.array(z.string())
});

export const BaselineOutputSchema = z.object({
  saved: z.boolean(),
  host: z.string(),
  label: z.string(),
  sample_count: z.number().int().min(1),
  message: z.string(),
  warnings: z.array(z.string())
});

export const CompareOutputSchema = z.object({
  host: z.string(),
  baseline_label: z.string(),
  baseline_samples: z.number().int().min(0),
  health_score: z.number().min(0).max(100),
  summary: z.string(),
  anomalies: z.array(AnomalySchema),
  warnings: z.array(z.string())
});

export const InspectCapabilitiesOutputSchema = z.object({
  host: z.string(),
  checked_at: z.string(),
  capabilities: z.array(HostCapabilitySchema),
  warnings: z.array(z.string())
});

export const HistoryPointSchema = z.object({
  timestamp: z.number().int(),
  value: z.number()
});

export const GetHistoryOutputSchema = z.object({
  host: z.string(),
  metric: MetricNameSchema,
  hours: z.number().int().min(1).max(168),
  label: z.string().nullable(),
  data_points: z.number().int().min(0),
  history: z.array(HistoryPointSchema)
});

export type ConnectionInput = z.infer<typeof ConnectionSchema>;
export type AnalyzeInput = z.infer<typeof AnalyzeSchema>;
export type SnapshotInput = z.infer<typeof SnapshotSchema>;
export type CapabilityInput = z.infer<typeof CapabilitySchema>;
export type BaselineInput = z.infer<typeof BaselineSchema>;
export type CompareInput = z.infer<typeof CompareSchema>;
export type GetHistoryInput = z.infer<typeof GetHistorySchema>;
export type MetricName = z.infer<typeof MetricNameSchema>;

export type RuntimeProfile = 'full' | 'remote-safe' | 'chatgpt' | 'claude';

export interface CollectionOptions {
  includeProcesses: boolean;
  includeNetwork: boolean;
}

export interface AnalysisThresholds {
  cpu_warn_percent: number;
  cpu_critical_percent: number;
  memory_warn_percent: number;
  memory_critical_percent: number;
  disk_warn_percent: number;
  disk_critical_percent: number;
  load_warn_ratio: number;
  load_critical_ratio: number;
  zscore_threshold: number;
}

export const DEFAULT_THRESHOLDS: AnalysisThresholds = {
  cpu_warn_percent: 85,
  cpu_critical_percent: 95,
  memory_warn_percent: 85,
  memory_critical_percent: 95,
  disk_warn_percent: 80,
  disk_critical_percent: 90,
  load_warn_ratio: 1.5,
  load_critical_ratio: 3,
  zscore_threshold: 2
};

export interface DiskMetric {
  filesystem: string;
  mount: string;
  total_gb: number;
  used_gb: number;
  usage_percent: number;
  inode_total?: number;
  inode_used?: number;
  inode_usage_percent?: number;
}

export interface NetworkMetric {
  interface: string;
  rx_bytes: number;
  tx_bytes: number;
  rx_packets?: number;
  tx_packets?: number;
  rx_errors?: number;
  tx_errors?: number;
  rx_dropped?: number;
  tx_dropped?: number;
  sample_window_seconds?: number;
  counter_reset?: boolean;
}

export interface SystemMetric {
  failed_units: number;
  kernel_error_events: number;
  kernel_signal_available?: boolean;
  kernel_window_minutes?: number;
}

export interface ProcessMetric {
  pid: number;
  name: string;
  cpu_percent: number;
  mem_percent: number;
  command: string;
}

export interface MetricSnapshot {
  timestamp: number;
  host: string;
  cpu: {
    usage_percent: number;
    load_1: number;
    load_5: number;
    load_15: number;
    core_count: number;
  };
  memory: {
    total_mb: number;
    used_mb: number;
    free_mb: number;
    usage_percent: number;
    swap_used_mb: number;
    swap_total_mb: number;
  };
  disk: DiskMetric[];
  network: NetworkMetric[];
  system: SystemMetric;
  processes: ProcessMetric[];
  os: {
    hostname: string;
    uptime_seconds: number;
    kernel: string;
    distro: string;
  };
  warnings: string[];
}

export interface HostCapability {
  name: string;
  available: boolean;
  source: string;
  detail?: string;
}

export interface Anomaly {
  metric: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  value: number;
  baseline_mean: number;
  z_score?: number;
  robust_z_score?: number;
  baseline_median?: number;
  normalized_load_per_core?: number;
  confidence?: number;
  root_cause_hypothesis?: string;
  evidence?: string[];
  suggested_next_checks?: string[];
  explanation: string;
  recommendation: string;
}

export type SnapshotClassification = 'observation' | 'baseline';

export interface StoredSnapshotRow {
  timestamp: number;
  cpu_percent: number;
  memory_percent: number;
  load_1: number;
  raw_json: string;
  label: string;
  classification: SnapshotClassification;
}
