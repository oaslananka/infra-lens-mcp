[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / ObservabilityRequestHandlerDependencies

# Interface: ObservabilityRequestHandlerDependencies

Defined in: [observability-server.ts:10](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/observability-server.ts#L10)

## Properties

### config

> **config**: [`ObservabilityConfig`](ObservabilityConfig.md)

Defined in: [observability-server.ts:11](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/observability-server.ts#L11)

***

### readLatest?

> `optional` **readLatest?**: () => [`LatestObservationSnapshots`](LatestObservationSnapshots.md)

Defined in: [observability-server.ts:12](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/observability-server.ts#L12)

#### Returns

[`LatestObservationSnapshots`](LatestObservationSnapshots.md)

***

### now?

> `optional` **now?**: () => `number`

Defined in: [observability-server.ts:13](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/observability-server.ts#L13)

#### Returns

`number`
