import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

import { analyzeSnapshot } from '../dist/analyzer.js';
import { saveSnapshot } from '../dist/baseline.js';
import { collectSnapshot } from '../dist/collector.js';
import { closeAllDatabases } from '../dist/db.js';
import {
  authorizeHttpRequest,
  parseHttpConfig,
  validateHostHeader,
  validateOriginHeader
} from '../dist/http-security.js';

const PERFORMANCE_BUDGETS = [
  { name: 'collector_parse_ms_per_op', iterations: 800, maxMsPerOp: 2.5 },
  { name: 'sqlite_write_ms_per_op', iterations: 500, maxMsPerOp: 5 },
  { name: 'baseline_analysis_ms_per_op', iterations: 800, maxMsPerOp: 2.5 },
  { name: 'http_validation_ms_per_op', iterations: 12000, maxMsPerOp: 0.25 }
];

const tempDirectory = mkdtempSync(join(tmpdir(), 'infra-lens-perf-'));
process.env.INFRA_LENS_DB = join(tempDirectory, 'metrics.db');

function rawMetrics() {
  return {
    cpu: 'cpu  100 0 50 850 0 0 0 0 0 0\ncpu  130 0 70 900 0 0 0 0 0 0\n0.42 0.38 0.35 1/123 456\n8\n',
    memory: '16384 6144 9216\n0 2048\n',
    disk: '/dev/sda1 / 120 58 48\n/dev/sdb1 /data 500 250 50\n',
    network: 'eth0 123456789 987654321\neth1 111 222\n',
    processes: [
      '1001\tnode\t12.5\t4.2\tnode dist/mcp.js',
      '1002\tpostgres\t7.1\t8.9\tpostgres: writer process',
      '1003\tsshd\t0.5\t0.2\tsshd: testuser'
    ].join('\n'),
    os: '6.8.0-test\nperf-host\nUbuntu 24.04 LTS\n123456.7\n'
  };
}

function snapshotFixture(index = 0) {
  return {
    timestamp: Date.now() + index,
    host: 'perf-host',
    cpu: { usage_percent: 35 + (index % 7), load_1: 0.5, load_5: 0.4, load_15: 0.3, core_count: 8 },
    memory: {
      total_mb: 16384,
      used_mb: 6144,
      free_mb: 10240,
      usage_percent: 38,
      swap_used_mb: 0,
      swap_total_mb: 2048
    },
    disk: [{ filesystem: '/dev/sda1', mount: '/', total_gb: 120, used_gb: 58, usage_percent: 48 }],
    network: [{ interface: 'eth0', rx_bytes: 123456789, tx_bytes: 987654321 }],
    processes: [
      { pid: 1001, name: 'node', cpu_percent: 12.5, mem_percent: 4.2, command: 'node dist/mcp.js' }
    ],
    os: {
      kernel: '6.8.0-test',
      hostname: 'perf-host',
      distro: 'Ubuntu 24.04 LTS',
      uptime_seconds: 123456.7
    }
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

function assertBudget(result) {
  if (result.msPerOp > result.maxMsPerOp) {
    throw new Error(
      `${result.name} exceeded ${result.maxMsPerOp}ms/op: ${result.msPerOp.toFixed(3)}ms/op`
    );
  }
}

function seedBaseline() {
  for (let index = 0; index < 120; index += 1) {
    saveSnapshot(snapshotFixture(index), 'default');
  }
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

async function runBenchmarks() {
  seedBaseline();
  return [
    await runBenchmark('collector_parse_ms_per_op', (iterations) =>
      measureAsync(iterations, () => collectSnapshot({ host: 'perf-host' }, createRunner()))
    ),
    await runBenchmark('sqlite_write_ms_per_op', (iterations) =>
      measureSync(iterations, (index) => saveSnapshot(snapshotFixture(index + 1000), 'perf-write'))
    ),
    await runBenchmark('baseline_analysis_ms_per_op', (iterations) =>
      measureSync(iterations, (index) => analyzeSnapshot(snapshotFixture(index + 2000)))
    ),
    await runBenchmark('http_validation_ms_per_op', runHttpValidation)
  ];
}

function printResults(results) {
  for (const result of results) {
    console.log(
      `${result.name}: ${result.msPerOp.toFixed(3)}ms/op <= ${result.maxMsPerOp}ms/op (${result.iterations} iterations)`
    );
  }
}

try {
  const results = await runBenchmarks();
  for (const result of results) {
    assertBudget(result);
  }
  printResults(results);
  console.log('Performance regression gate passed.');
} finally {
  closeAllDatabases();
  rmSync(tempDirectory, { recursive: true, force: true });
}
