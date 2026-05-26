[**mcp-infra-lens v1.0.6**](../README.md)

***

[mcp-infra-lens](../README.md) / analyzeSnapshot

# Function: analyzeSnapshot()

> **analyzeSnapshot**(`snapshot`, `baselineLabel?`, `thresholds?`): `object`

Defined in: [analyzer.ts:20](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/analyzer.ts#L20)

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
