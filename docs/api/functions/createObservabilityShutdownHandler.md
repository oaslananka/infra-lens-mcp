[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / createObservabilityShutdownHandler

# Function: createObservabilityShutdownHandler()

> **createObservabilityShutdownHandler**(`httpServer`, `interval`, `clearTimer?`, `exit?`, `timeoutMs?`): (`signal`) => `void`

Defined in: [observe.ts:45](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/observe.ts#L45)

## Parameters

### httpServer

[`HttpServer`](../type-aliases/HttpServer.md)

### interval

`Timeout` \| `null`

### clearTimer?

(`timer`) => `void`

### exit?

(`code`) => `void`

### timeoutMs?

`number` = `10_000`

## Returns

(`signal`) => `void`
