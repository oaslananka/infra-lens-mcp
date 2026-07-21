[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / ExportOtlpMetricsOptions

# Interface: ExportOtlpMetricsOptions

Defined in: [otlp-metrics.ts:87](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/otlp-metrics.ts#L87)

## Properties

### config

> **config**: [`OtlpMetricsConfig`](OtlpMetricsConfig.md)

Defined in: [otlp-metrics.ts:88](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/otlp-metrics.ts#L88)

***

### points

> **points**: [`MetricPoint`](MetricPoint.md)[]

Defined in: [otlp-metrics.ts:89](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/otlp-metrics.ts#L89)

***

### fetchImpl?

> `optional` **fetchImpl?**: (`input`, `init?`) => `Promise`\<`Response`\>

Defined in: [otlp-metrics.ts:90](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/otlp-metrics.ts#L90)

#### Parameters

##### input

`string` \| `URL` \| `Request`

##### init?

`RequestInit`

#### Returns

`Promise`\<`Response`\>
