[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / ToolDependencies

# Interface: ToolDependencies

Defined in: [server-core.ts:97](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L97)

## Properties

### analyzeSnapshot

> **analyzeSnapshot**: (`snapshot`, `baselineLabel`, `thresholds`) => `object`

Defined in: [server-core.ts:98](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L98)

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

Defined in: [server-core.ts:99](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L99)

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

Defined in: [server-core.ts:100](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L100)

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

### inspectHostCapabilities

> **inspectHostCapabilities**: (`connection`, `runner`) => `Promise`\<\{ `capabilities`: [`HostCapability`](HostCapability.md)[]; `warnings`: `string`[]; \}\>

Defined in: [server-core.ts:101](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L101)

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

#### Returns

`Promise`\<\{ `capabilities`: [`HostCapability`](HostCapability.md)[]; `warnings`: `string`[]; \}\>

***

### getBaseline

> **getBaseline**: (`host`, `label`) => \{ `cpu_samples`: `number`[]; `memory_mean`: `number`; `load_mean`: `number`; `sample_count`: `number`; \} \| `null`

Defined in: [server-core.ts:102](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L102)

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

Defined in: [server-core.ts:103](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L103)

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

### getHistoryPage?

> `optional` **getHistoryPage?**: (`options`) => [`HistoryPage`](HistoryPage.md)

Defined in: [server-core.ts:104](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L104)

#### Parameters

##### options

[`HistoryPageOptions`](HistoryPageOptions.md)

#### Returns

[`HistoryPage`](HistoryPage.md)

***

### getObservationWindow?

> `optional` **getObservationWindow?**: (`options`) => [`ObservationWindow`](ObservationWindow.md)

Defined in: [server-core.ts:105](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L105)

#### Parameters

##### options

[`ObservationWindowOptions`](ObservationWindowOptions.md)

#### Returns

[`ObservationWindow`](ObservationWindow.md)

***

### buildIncidentReportDraft?

> `optional` **buildIncidentReportDraft?**: (`options`) => [`IncidentReportDraft`](IncidentReportDraft.md)

Defined in: [server-core.ts:106](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L106)

#### Parameters

##### options

[`IncidentReportDraftOptions`](IncidentReportDraftOptions.md)

#### Returns

[`IncidentReportDraft`](IncidentReportDraft.md)

***

### buildRemediationPlan?

> `optional` **buildRemediationPlan?**: (`snapshot`, `analysis`, `now`) => [`RemediationPlan`](RemediationPlan.md)

Defined in: [server-core.ts:107](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L107)

#### Parameters

##### snapshot

[`MetricSnapshot`](MetricSnapshot.md)

##### analysis

[`SnapshotAnalysis`](SnapshotAnalysis.md)

##### now?

`number` = `...`

#### Returns

[`RemediationPlan`](RemediationPlan.md)

***

### compareIncidentWindows?

> `optional` **compareIncidentWindows?**: (`leftLabel`, `left`, `rightLabel`, `right`) => [`IncidentWindowComparison`](IncidentWindowComparison.md)

Defined in: [server-core.ts:108](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L108)

#### Parameters

##### leftLabel

`string`

##### left

[`IncidentWindowSummary`](IncidentWindowSummary.md)

##### rightLabel

`string`

##### right

[`IncidentWindowSummary`](IncidentWindowSummary.md)

#### Returns

[`IncidentWindowComparison`](IncidentWindowComparison.md)

***

### summarizeIncidentWindow?

> `optional` **summarizeIncidentWindow?**: (`snapshots`) => [`IncidentWindowSummary`](IncidentWindowSummary.md)

Defined in: [server-core.ts:109](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L109)

#### Parameters

##### snapshots

[`MetricSnapshot`](MetricSnapshot.md)[]

#### Returns

[`IncidentWindowSummary`](IncidentWindowSummary.md)

***

### saveSnapshot

> **saveSnapshot**: (`snapshot`, `label`, `classification`) => `void`

Defined in: [server-core.ts:110](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L110)

#### Parameters

##### snapshot

[`MetricSnapshot`](MetricSnapshot.md)

##### label?

`string` = `'default'`

##### classification?

[`SnapshotClassification`](../type-aliases/SnapshotClassification.md) = `'observation'`

#### Returns

`void`
