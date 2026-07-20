#!/usr/bin/env node
import { chmodSync, writeFileSync } from 'node:fs';

import { closeAllDatabases } from './db.js';
import {
  collectHistoryExport,
  formatHistoryExport,
  type HistoryExportFormat
} from './history-export.js';
import type { MetricName } from './types.js';

interface CliOptions {
  host: string;
  hours: number;
  metric: MetricName;
  label?: string;
  format: HistoryExportFormat;
  output?: string;
}

function usage(): never {
  throw new TypeError(
    'Usage: infra-lens-export --host <host> [--hours 24] [--metric cpu|memory|load] [--label name] [--format json|ndjson] [--output file]'
  );
}

function parseArguments(argv: string[]): CliOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith('--') || !value) {
      usage();
    }
    values.set(flag.slice(2), value);
  }

  const host = values.get('host');
  if (!host) {
    usage();
  }
  const hours = Number(values.get('hours') ?? '24');
  if (!Number.isSafeInteger(hours) || hours < 1 || hours > 8760) {
    throw new TypeError('--hours must be an integer between 1 and 8760.');
  }
  const metric = values.get('metric') ?? 'cpu';
  if (!['cpu', 'memory', 'load'].includes(metric)) {
    throw new TypeError('--metric must be cpu, memory, or load.');
  }
  const format = values.get('format') ?? 'json';
  if (!['json', 'ndjson'].includes(format)) {
    throw new TypeError('--format must be json or ndjson.');
  }

  return {
    host,
    hours,
    metric: metric as MetricName,
    format: format as HistoryExportFormat,
    ...(values.get('label') ? { label: values.get('label') } : {}),
    ...(values.get('output') ? { output: values.get('output') } : {})
  };
}

try {
  const options = parseArguments(process.argv.slice(2));
  const records = collectHistoryExport(options);
  const output = formatHistoryExport(records, options.format);
  if (options.output) {
    writeFileSync(options.output, output, { encoding: 'utf8', mode: 0o600 });
    chmodSync(options.output, 0o600);
  } else {
    process.stdout.write(output);
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'History export failed.'}\n`);
  process.exitCode = 1;
} finally {
  closeAllDatabases();
}
