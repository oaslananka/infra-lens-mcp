[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / IncidentReportDraft

# Interface: IncidentReportDraft

Defined in: [incidents.ts:68](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/incidents.ts#L68)

## Properties

### status

> **status**: `"draft"`

Defined in: [incidents.ts:69](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/incidents.ts#L69)

***

### review\_required

> **review\_required**: `true`

Defined in: [incidents.ts:70](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/incidents.ts#L70)

***

### host

> **host**: `string`

Defined in: [incidents.ts:71](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/incidents.ts#L71)

***

### generated\_at

> **generated\_at**: `string`

Defined in: [incidents.ts:72](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/incidents.ts#L72)

***

### window

> **window**: `object`

Defined in: [incidents.ts:73](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/incidents.ts#L73)

#### from

> **from**: `number`

#### to

> **to**: `number`

***

### sample\_count

> **sample\_count**: `number`

Defined in: [incidents.ts:74](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/incidents.ts#L74)

***

### invalid\_rows

> **invalid\_rows**: `number`

Defined in: [incidents.ts:75](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/incidents.ts#L75)

***

### completeness

> **completeness**: `"complete"` \| `"partial"` \| `"incomplete"`

Defined in: [incidents.ts:76](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/incidents.ts#L76)

***

### executive\_summary

> **executive\_summary**: `string`

Defined in: [incidents.ts:77](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/incidents.ts#L77)

***

### impact\_signals

> **impact\_signals**: `string`[]

Defined in: [incidents.ts:78](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/incidents.ts#L78)

***

### detection\_evidence

> **detection\_evidence**: `string`[]

Defined in: [incidents.ts:79](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/incidents.ts#L79)

***

### timeline

> **timeline**: [`IncidentTimelineEntry`](IncidentTimelineEntry.md)[]

Defined in: [incidents.ts:80](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/incidents.ts#L80)

***

### remediation

> **remediation**: [`RemediationPlan`](RemediationPlan.md)

Defined in: [incidents.ts:81](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/incidents.ts#L81)

***

### postmortem

> **postmortem**: `object`

Defined in: [incidents.ts:82](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/incidents.ts#L82)

#### contributing\_factors

> **contributing\_factors**: `string`[]

#### what\_went\_well

> **what\_went\_well**: `string`[]

#### improvement\_actions

> **improvement\_actions**: `string`[]

#### open\_questions

> **open\_questions**: `string`[]
