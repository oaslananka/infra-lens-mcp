import type { RequestListener, ServerResponse } from 'node:http';

import { getLatestObservationSnapshots, type LatestObservationSnapshots } from './baseline.js';
import type { ObservabilityConfig } from './observability-config.js';
import { buildLatestMetricPoints, renderOpenMetrics } from './observability-metrics.js';

export const OPENMETRICS_CONTENT_TYPE =
  'application/openmetrics-text; version=1.0.0; charset=utf-8';

export interface ObservabilityRequestHandlerDependencies {
  config: ObservabilityConfig;
  readLatest?: () => LatestObservationSnapshots;
  now?: () => number;
}

function setSecurityHeaders(response: ServerResponse): void {
  response.setHeader('cache-control', 'no-store');
  response.setHeader('x-content-type-options', 'nosniff');
}

function sendText(response: ServerResponse, statusCode: number, body: string): void {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'text/plain; charset=utf-8');
  response.end(body);
}

export function createObservabilityRequestHandler({
  config,
  readLatest = getLatestObservationSnapshots,
  now = Date.now
}: ObservabilityRequestHandlerDependencies): RequestListener {
  return (request, response) => {
    setSecurityHeaders(response);
    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (path !== config.path) {
      sendText(response, 404, 'Not found.\n');
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('allow', 'GET, HEAD');
      sendText(response, 405, 'Method not allowed.\n');
      return;
    }

    try {
      const latest = readLatest();
      const body = renderOpenMetrics(
        buildLatestMetricPoints(latest.snapshots, {
          now: now(),
          maxAgeSeconds: config.maxAgeSeconds,
          invalidRows: latest.invalidRows
        })
      );
      response.statusCode = 200;
      response.setHeader('content-type', OPENMETRICS_CONTENT_TYPE);
      response.setHeader('content-length', String(Buffer.byteLength(body)));
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      sendText(response, 500, 'Metrics unavailable.\n');
    }
  };
}
