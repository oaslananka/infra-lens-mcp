[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / buildOtlpMetricsRequest

# Function: buildOtlpMetricsRequest()

> **buildOtlpMetricsRequest**(`points`, `config`): [`OtlpMetricsRequest`](../interfaces/OtlpMetricsRequest.md)

Defined in: [otlp-metrics.ts:43](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/otlp-metrics.ts#L43)

## Parameters

### points

[`MetricPoint`](../interfaces/MetricPoint.md)[]

### config

`Pick`\<[`OtlpMetricsConfig`](../interfaces/OtlpMetricsConfig.md), `"serviceName"` \| `"resourceAttributes"`\>

## Returns

[`OtlpMetricsRequest`](../interfaces/OtlpMetricsRequest.md)
