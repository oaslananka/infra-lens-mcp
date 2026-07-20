[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / analyzeSnapshot

# Function: analyzeSnapshot()

> **analyzeSnapshot**(`snapshot`, `baselineLabel?`, `thresholds?`): `object`

Defined in: [analyzer.ts:115](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/analyzer.ts#L115)

## Parameters

### snapshot

[`MetricSnapshot`](../interfaces/MetricSnapshot.md)

### baselineLabel?

`string` = `'default'`

### thresholds?

[`AnalysisThresholds`](../interfaces/AnalysisThresholds.md) = `DEFAULT_THRESHOLDS`

## Returns

`object`

### anomalies

> **anomalies**: [`Anomaly`](../interfaces/Anomaly.md)[]

### summary

> **summary**: `string`

### health\_score

> **health\_score**: `number`
