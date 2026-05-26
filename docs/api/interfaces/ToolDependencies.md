[**mcp-infra-lens v1.0.6**](../README.md)

***

[mcp-infra-lens](../README.md) / ToolDependencies

# Interface: ToolDependencies

Defined in: [server-core.ts:62](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L62)

## Properties

### analyzeSnapshot

> **analyzeSnapshot**: (`snapshot`, `baselineLabel`, `thresholds`) => `object`

Defined in: [server-core.ts:63](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L63)

#### Parameters

##### snapshot

[`MetricSnapshot`](MetricSnapshot.md)

##### baselineLabel?

`string` = `'default'`

##### thresholds?

[`AnalysisThresholds`](AnalysisThresholds.md) = `DEFAULT_THRESHOLDS`

#### Returns

`object`

##### anomalies

> **anomalies**: [`Anomaly`](Anomaly.md)[]

##### summary

> **summary**: `string`

##### health\_score

> **health\_score**: `number`

***

### collectSampledSnapshot

> **collectSampledSnapshot**: (`connection`, `durationMinutes`, `intervalSeconds`, `runner`, `options`) => `Promise`\<[`MetricSnapshot`](MetricSnapshot.md)\>

Defined in: [server-core.ts:64](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L64)

#### Parameters

##### connection

###### host

`string` = `...`

###### port

`number` = `...`

###### username

`string` = `...`

###### password?

`string` = `...`

###### privateKey?

`string` = `...`

###### passphrase?

`string` = `...`

###### hostKeySha256?

`string` = `...`

###### knownHostsPath?

`string` = `...`

##### durationMinutes

`number`

##### intervalSeconds?

`number` = `30`

##### runner?

[`CollectorRunner`](CollectorRunner.md) = `...`

##### options?

[`CollectionOptions`](CollectionOptions.md) = `DEFAULT_COLLECTION_OPTIONS`

#### Returns

`Promise`\<[`MetricSnapshot`](MetricSnapshot.md)\>

***

### collectSnapshot

> **collectSnapshot**: (`connection`, `runner`, `options`) => `Promise`\<[`MetricSnapshot`](MetricSnapshot.md)\>

Defined in: [server-core.ts:65](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L65)

#### Parameters

##### connection

###### host

`string` = `...`

###### port

`number` = `...`

###### username

`string` = `...`

###### password?

`string` = `...`

###### privateKey?

`string` = `...`

###### passphrase?

`string` = `...`

###### hostKeySha256?

`string` = `...`

###### knownHostsPath?

`string` = `...`

##### runner?

[`CollectorRunner`](CollectorRunner.md) = `...`

##### options?

[`CollectionOptions`](CollectionOptions.md) = `DEFAULT_COLLECTION_OPTIONS`

#### Returns

`Promise`\<[`MetricSnapshot`](MetricSnapshot.md)\>

***

### getBaseline

> **getBaseline**: (`host`, `label`) => \{ `cpu_samples`: `number`[]; `memory_mean`: `number`; `load_mean`: `number`; `sample_count`: `number`; \} \| `null`

Defined in: [server-core.ts:66](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L66)

#### Parameters

##### host

`string`

##### label?

`string` = `'default'`

#### Returns

\{ `cpu_samples`: `number`[]; `memory_mean`: `number`; `load_mean`: `number`; `sample_count`: `number`; \} \| `null`

***

### getHistory

> **getHistory**: (`host`, `_metric`, `hours`, `label?`) => [`StoredSnapshotRow`](StoredSnapshotRow.md)[]

Defined in: [server-core.ts:67](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L67)

#### Parameters

##### host

`string`

##### \_metric

`"cpu"` \| `"memory"` \| `"load"`

##### hours

`number`

##### label?

`string`

#### Returns

[`StoredSnapshotRow`](StoredSnapshotRow.md)[]

***

### saveSnapshot

> **saveSnapshot**: (`snapshot`, `label`) => `void`

Defined in: [server-core.ts:68](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L68)

#### Parameters

##### snapshot

[`MetricSnapshot`](MetricSnapshot.md)

##### label?

`string` = `'default'`

#### Returns

`void`
