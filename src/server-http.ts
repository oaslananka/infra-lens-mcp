import {
  createServer,
  type IncomingMessage,
  type RequestListener,
  type Server as HttpServer,
  type ServerResponse
} from 'node:http';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import { isMainModule } from './entrypoint.js';
import {
  authorizeHttpRequest,
  createConcurrencyLimiter,
  createProtectedResourceMetadata,
  createRateLimiter,
  parseHttpConfig,
  readJsonBodyWithLimit,
  sendJsonError,
  validateHostHeader,
  validateHttpConfiguration,
  validateMcpHttpRequest,
  validateOriginHeader,
  type ConcurrencyLimiter,
  type HttpConfig,
  type RateLimiter
} from './http-security.js';
import { createLogger } from './logging.js';
import { registerToolsOnServer } from './server-core.js';
import { createHttpShutdownHandler, type HttpTransportLike } from './shutdown.js';
import { getPackageVersion } from './version.js';

const logger = createLogger('server-http');

export interface HttpRequestTransport extends HttpTransportLike {
  handleRequest(
    request: IncomingMessage,
    response: ServerResponse,
    body?: unknown
  ): Promise<void> | void;
}

export interface HttpRequestHandlerDependencies {
  config: HttpConfig;
  transport: HttpRequestTransport;
  concurrencyLimiter?: ConcurrencyLimiter;
  rateLimiter?: RateLimiter;
}

interface SignalRegistrar {
  once(signal: 'SIGTERM' | 'SIGINT', listener: () => void): unknown;
}

export interface HttpRuntimeDependencies {
  env?: Record<string, string | undefined>;
  createTransport?: () => Promise<HttpRequestTransport>;
  createServer?: (handler: RequestListener) => HttpServer;
  signals?: SignalRegistrar;
  exit?: (code: number) => void;
  logListening?: (message: string) => void;
}

export interface HttpRuntime {
  config: HttpConfig;
  transport: HttpRequestTransport;
  httpServer: HttpServer;
}

export async function createHttpTransport(): Promise<HttpRequestTransport> {
  const server = new McpServer(
    {
      name: 'infra-lens-mcp',
      version: getPackageVersion()
    },
    {
      capabilities: {
        logging: {}
      }
    }
  );
  registerToolsOnServer(server);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });

  await server.connect(transport);
  return transport;
}

function errorStatusCode(error: unknown): number {
  const message = error instanceof Error ? error.message : 'Unexpected server error';
  if (message.includes('too large')) {
    return 413;
  }
  if (message.includes('timed out')) {
    return 408;
  }
  if (message.includes('valid JSON')) {
    return 400;
  }
  return 500;
}

export function createHttpRequestHandler({
  config,
  transport,
  concurrencyLimiter = createConcurrencyLimiter(config.maxConcurrentRequests),
  rateLimiter = createRateLimiter(config.rateLimitPerMinute)
}: HttpRequestHandlerDependencies): RequestListener {
  return (request, response) => {
    request.setTimeout(config.requestTimeoutMs, () => {
      request.destroy(new Error('HTTP request timed out.'));
    });

    void (async () => {
      let acquiredConcurrencySlot = false;

      try {
        if (!concurrencyLimiter.tryAcquire()) {
          sendJsonError(response, 503, 'Too many concurrent requests.', { 'Retry-After': '1' });
          return;
        }
        acquiredConcurrencySlot = true;

        const rateDecision = rateLimiter.check(request.socket.remoteAddress ?? 'unknown');
        if (!rateDecision.ok) {
          sendJsonError(
            response,
            rateDecision.statusCode ?? 429,
            rateDecision.message ?? 'Too many requests.',
            rateDecision.headers
          );
          return;
        }
        if (request.url?.startsWith('/.well-known/oauth-protected-resource')) {
          response.statusCode = 200;
          response.setHeader('content-type', 'application/json');
          response.end(JSON.stringify(createProtectedResourceMetadata(config)));
          return;
        }

        const hostDecision = validateHostHeader(request.headers.host, config);
        if (!hostDecision.ok) {
          sendJsonError(
            response,
            hostDecision.statusCode ?? 400,
            hostDecision.message ?? 'Bad request.'
          );
          return;
        }

        const originDecision = validateOriginHeader(request.headers.origin, config);
        if (!originDecision.ok) {
          sendJsonError(
            response,
            originDecision.statusCode ?? 403,
            originDecision.message ?? 'Forbidden.'
          );
          return;
        }

        const endpointDecision = validateMcpHttpRequest(request, config);
        if (!endpointDecision.ok) {
          sendJsonError(
            response,
            endpointDecision.statusCode ?? 400,
            endpointDecision.message ?? 'Bad request.',
            endpointDecision.headers
          );
          return;
        }

        const authDecision = authorizeHttpRequest(
          request.headers.authorization,
          config,
          request.headers
        );
        if (!authDecision.ok) {
          sendJsonError(
            response,
            authDecision.statusCode ?? 401,
            authDecision.message ?? 'Authentication failed.',
            authDecision.headers
          );
          return;
        }

        const parsedBody = await readJsonBodyWithLimit(request, config.bodyLimitBytes);
        await transport.handleRequest(request, response, parsedBody);
      } catch (error) {
        const statusCode = errorStatusCode(error);
        const message = error instanceof Error ? error.message : 'Unexpected server error';
        sendJsonError(
          response,
          statusCode,
          statusCode === 500 ? 'Unexpected server error.' : message
        );
      } finally {
        if (acquiredConcurrencySlot) {
          concurrencyLimiter.release();
        }
      }
    })();
  };
}

export async function startHttpRuntime(
  dependencies: HttpRuntimeDependencies = {}
): Promise<HttpRuntime> {
  const config = parseHttpConfig(dependencies.env ?? process.env);
  validateHttpConfiguration(config);
  const transport = await (dependencies.createTransport ?? createHttpTransport)();
  const handler = createHttpRequestHandler({ config, transport });
  const httpServer = (dependencies.createServer ?? createServer)(handler);

  await new Promise<void>((resolve) => {
    httpServer.listen(config.port, config.host, resolve);
  });

  const listeningMessage = `infra-lens-mcp HTTP transport listening on http://${config.host}:${config.port}${config.endpointPath}`;
  (dependencies.logListening ?? ((message) => logger.info(message)))(listeningMessage);

  const shutdown = createHttpShutdownHandler(httpServer, transport, dependencies.exit);
  const signals = dependencies.signals ?? process;
  signals.once('SIGTERM', () => shutdown('SIGTERM'));
  signals.once('SIGINT', () => shutdown('SIGINT'));

  return { config, transport, httpServer };
}

/* istanbul ignore next -- exercised by black-box process tests */
if (isMainModule(import.meta.url)) {
  await startHttpRuntime();
}
