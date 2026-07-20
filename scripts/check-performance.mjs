import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

import { analyzeSnapshot } from '../dist/analyzer.js';
import { getHistoryPage, saveSnapshot } from '../dist/baseline.js';
import { buildCollectionCommandPlan, collectSnapshot } from '../dist/collector.js';
import { closeAllDatabases, getDatabase } from '../dist/db.js';
import { collectHistoryExport, formatHistoryExport } from '../dist/history-export.js';
import {
  authorizeHttpRequest,
  parseHttpConfig,
  validateHostHeader,
  validateOriginHeader
} from '../dist/http-security.js';

const policy = JSON.parse(readFileSync('performance-budget.json', 'utf8'));
const PERFORMANCE_BUDGETS = Object.entries(policy.latency).map(([name, budget]) => ({
  name,
  ...budget
}));
const RESOURCE_BUDGETS = policy.resources;

const tempDirectory = mkdtempSync(join(tmpdir(), 'infra-lens-perf-'));
process.env.INFRA_LENS_DB = join(tempDirectory, 'metrics.db');
process.env.INFRA_LENS_RETENTION_DAYS = '0';

function rawMetrics() {
  return {
    cpu: 'cpu  100 0 50 850 0 0 0 0 0 0\ncpu  130 0 70 900 0 0 0 0 0 0\n0.42 0.38 0.35 1/123 456\n8\n',
    memory: '16384 6144 9216\n0 2048\n',
    disk: '/dev/sda1 / 120 58 48\n/dev/sdb1 /data 500 250 50\n',
    diskInodes: '/dev/sda1 / 1000000 100000 10\n/dev/sdb1 /data 2000000 200000 10\n',
    network: 'eth0 1000 2000 100 100 0 0 0 0 0\neth1 111 222 10 10 0 0 0 0 0\n',
    system:
      'failed_units 0\nkernel_error_events 0\nkernel_signal_available 1\nkernel_window_minutes 5\n',
    processes: [
      '1001\tnode\t12.5\t4.2\tnode dist/mcp.js',
      '1002\tpostgres\t7.1\t8.9\tpostgres: writer process',
      '1003\tsshd\t0.5\t0.2\tsshd: testuser'
    ].join('\n'),
    os: '6.8.0-test\nperf-host\nUbuntu 24.04 LTS\n123456.7\n'
  };
}

function snapshotFixture(index = 0, host = 'perf-host') {
  return {
    timestamp: Date.now() + index,
    host,
    cpu: {
      usage_percent: 35 + (index % 7),
      load_1: 0.5,
      load_5: 0.4,
      load_15: 0.3,
      core_count: 8
    },
    memory: {
      total_mb: 16384,
      used_mb: 6144,
      free_mb: 10240,
      usage_percent: 38,
      swap_used_mb: 0,
      swap_total_mb: 2048
    },
    disk: [{ filesystem: '/dev/sda1', mount: '/', total_gb: 120, used_gb: 58, usage_percent: 48 }],
    network: [{ interface: 'eth0', rx_bytes: 1000, tx_bytes: 2000 }],
    system: { failed_units: 0, kernel_error_events: 0 },
    processes: [
      {
        pid: 1001,
        name: 'node',
        cpu_percent: 12.5,
        mem_percent: 4.2,
        command: 'node dist/mcp.js'
      }
    ],
    os: {
      kernel: '6.8.0-test',
      hostname: host,
      distro: 'Ubuntu 24.04 LTS',
      uptime_seconds: 123456.7
    },
    warnings: []
  };
}

function createRunner() {
  return {
    async run() {
      return rawMetrics();
    }
  };
}

function measureSync(iterations, operation) {
  const startedAt = performance.now();
  for (let index = 0; index < iterations; index += 1) {
    operation(index);
  }
  return (performance.now() - startedAt) / iterations;
}

async function measureAsync(iterations, operation) {
  const startedAt = performance.now();
  for (let index = 0; index < iterations; index += 1) {
    await operation(index);
  }
  return (performance.now() - startedAt) / iterations;
}

function getBudget(name) {
  const budget = PERFORMANCE_BUDGETS.find((entry) => entry.name === name);
  if (!budget) {
    throw new Error(`Missing performance budget for ${name}.`);
  }
  return budget;
}

async function runBenchmark(name, operation) {
  const budget = getBudget(name);
  const msPerOp = await operation(budget.iterations);
  return { ...budget, msPerOp };
}

function assertLatencyBudget(result) {
  if (result.msPerOp > result.maxMsPerOp) {
    throw new Error(
      `${result.name} exceeded ${result.maxMsPerOp}ms/op: ${result.msPerOp.toFixed(3)}ms/op`
    );
  }
}

function seedBaseline() {
  for (let index = 0; index < 120; index += 1) {
    saveSnapshot(snapshotFixture(index), 'default', 'baseline');
  }
}

function seedLargeHistory(rowCount) {
  const database = getDatabase();
  const host = 'large-history-perf-host';
  const timestamp = Date.now() - rowCount - 1000;
  const statement = database.prepare(`
    INSERT INTO snapshots (
      host, label, classification, timestamp, cpu_percent, memory_percent, load_1, raw_json
    ) VALUES (?, 'default', 'observation', ?, ?, ?, ?, ?)
  `);
  const insertRows = database.transaction(() => {
    for (let index = 0; index < rowCount; index += 1) {
      const snapshot = snapshotFixture(index, host);
      snapshot.timestamp = timestamp + index;
      statement.run(
        host,
        snapshot.timestamp,
        snapshot.cpu.usage_percent,
        snapshot.memory.usage_percent,
        snapshot.cpu.load_1,
        JSON.stringify(snapshot)
      );
    }
  });
  insertRows();
  return { host, now: timestamp + rowCount + 1000 };
}

function runHttpValidation(iterations) {
  const config = parseHttpConfig({
    MCP_HTTP_ALLOWED_ORIGINS: 'https://chat.openai.com,https://example.com',
    MCP_HTTP_ALLOWED_HOSTS: 'localhost,127.0.0.1',
    MCP_HTTP_AUTH_MODE: 'bearer',
    MCP_HTTP_BEARER_TOKEN: 'perf-token'
  });
  return measureSync(iterations, () => {
    validateOriginHeader('https://chat.openai.com', config);
    validateHostHeader('localhost:3000', config);
    authorizeHttpRequest('Bearer perf-token', config);
  });
}

function runHistoryPage(iterations, stream) {
  return measureSync(iterations, () => {
    const page = getHistoryPage({
      host: stream.host,
      metric: 'cpu',
      hours: 24,
      limit: 200,
      now: stream.now
    });
    if (page.items.length !== 200 || !page.has_more) {
      throw new Error('Large-history page fixture did not return the expected bounded page.');
    }
  });
}

function assertCommandBudgets() {
  const fullCount = buildCollectionCommandPlan({
    includeProcesses: true,
    includeNetwork: true
  }).length;
  const minimalCount = buildCollectionCommandPlan({
    includeProcesses: false,
    includeNetwork: false
  }).length;

  if (fullCount > RESOURCE_BUDGETS.maxFullCollectionCommands) {
    throw new Error(
      `Full collection plan uses ${fullCount} commands; budget is ${RESOURCE_BUDGETS.maxFullCollectionCommands}.`
    );
  }
  if (minimalCount > RESOURCE_BUDGETS.maxMinimalCollectionCommands) {
    throw new Error(
      `Minimal collection plan uses ${minimalCount} commands; budget is ${RESOURCE_BUDGETS.maxMinimalCollectionCommands}.`
    );
  }
  return { fullCount, minimalCount };
}

function measureLargeHistoryResources(stream) {
  globalThis.gc?.();
  const heapBefore = process.memoryUsage().heapUsed;
  const startedAt = performance.now();
  const records = collectHistoryExport({
    host: stream.host,
    metric: 'cpu',
    hours: 24,
    now: stream.now
  });
  const output = formatHistoryExport(records, 'ndjson');
  const elapsedMs = performance.now() - startedAt;
  const outputBytes = Buffer.byteLength(output);
  globalThis.gc?.();
  const heapGrowthBytes = Math.max(0, process.memoryUsage().heapUsed - heapBefore);

  if (records.length !== RESOURCE_BUDGETS.largeHistoryRows) {
    throw new Error(
      `Large-history export returned ${records.length} rows; expected ${RESOURCE_BUDGETS.largeHistoryRows}.`
    );
  }
  if (elapsedMs > RESOURCE_BUDGETS.maxExportMs) {
    throw new Error(
      `Large-history export took ${elapsedMs.toFixed(1)}ms; budget is ${RESOURCE_BUDGETS.maxExportMs}ms.`
    );
  }
  if (outputBytes > RESOURCE_BUDGETS.maxExportBytes) {
    throw new Error(
      `Large-history export produced ${outputBytes} bytes; budget is ${RESOURCE_BUDGETS.maxExportBytes}.`
    );
  }
  if (heapGrowthBytes > RESOURCE_BUDGETS.maxHeapGrowthBytes) {
    throw new Error(
      `Large-history export retained ${heapGrowthBytes} heap bytes; budget is ${RESOURCE_BUDGETS.maxHeapGrowthBytes}.`
    );
  }

  return { elapsedMs, outputBytes, heapGrowthBytes, rows: records.length };
}

async function runBenchmarks() {
  seedBaseline();
  const historyStream = seedLargeHistory(RESOURCE_BUDGETS.largeHistoryRows);
  return {
    latency: [
      await runBenchmark('collector_parse_ms_per_op', (iterations) =>
        measureAsync(iterations, () => collectSnapshot({ host: 'perf-host' }, createRunner()))
      ),
      await runBenchmark('sqlite_write_ms_per_op', (iterations) =>
        measureSync(iterations, (index) =>
          saveSnapshot(snapshotFixture(index + 1000), 'perf-write')
        )
      ),
      await runBenchmark('baseline_analysis_ms_per_op', (iterations) =>
        measureSync(iterations, (index) => analyzeSnapshot(snapshotFixture(index + 2000)))
      ),
      await runBenchmark('http_validation_ms_per_op', runHttpValidation),
      await runBenchmark('large_history_page_ms_per_op', (iterations) =>
        runHistoryPage(iterations, historyStream)
      )
    ],
    commands: assertCommandBudgets(),
    resources: measureLargeHistoryResources(historyStream)
  };
}

function printResults(results) {
  for (const result of results.latency) {
    console.log(
      `${result.name}: ${result.msPerOp.toFixed(3)}ms/op <= ${result.maxMsPerOp}ms/op (${result.iterations} iterations)`
    );
  }
  console.log(
    `collector_commands: full ${results.commands.fullCount}/${RESOURCE_BUDGETS.maxFullCollectionCommands}, minimal ${results.commands.minimalCount}/${RESOURCE_BUDGETS.maxMinimalCollectionCommands}`
  );
  console.log(
    `large_history_export: ${results.resources.rows} rows, ${results.resources.elapsedMs.toFixed(1)}ms/${RESOURCE_BUDGETS.maxExportMs}ms, ${results.resources.outputBytes}/${RESOURCE_BUDGETS.maxExportBytes} bytes, ${results.resources.heapGrowthBytes}/${RESOURCE_BUDGETS.maxHeapGrowthBytes} retained heap bytes`
  );
}

try {
  const results = await runBenchmarks();
  for (const result of results.latency) {
    assertLatencyBudget(result);
  }
  printResults(results);
  console.log('Performance and resource regression gates passed.');
} finally {
  closeAllDatabases();
  delete process.env.INFRA_LENS_RETENTION_DAYS;
  rmSync(tempDirectory, { recursive: true, force: true });
}
