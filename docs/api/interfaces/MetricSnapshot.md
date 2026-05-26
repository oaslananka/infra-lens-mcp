[**mcp-infra-lens v1.0.6**](../README.md)

***

[mcp-infra-lens](../README.md) / MetricSnapshot

# Interface: MetricSnapshot

Defined in: [types.ts:135](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L135)

## Properties

### timestamp

> **timestamp**: `number`

Defined in: [types.ts:136](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L136)

***

### host

> **host**: `string`

Defined in: [types.ts:137](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L137)

***

### cpu

> **cpu**: `object`

Defined in: [types.ts:138](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L138)

#### usage\_percent

> **usage\_percent**: `number`

#### load\_1

> **load\_1**: `number`

#### load\_5

> **load\_5**: `number`

#### load\_15

> **load\_15**: `number`

#### core\_count

> **core\_count**: `number`

***

### memory

> **memory**: `object`

Defined in: [types.ts:145](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L145)

#### total\_mb

> **total\_mb**: `number`

#### used\_mb

> **used\_mb**: `number`

#### free\_mb

> **free\_mb**: `number`

#### usage\_percent

> **usage\_percent**: `number`

#### swap\_used\_mb

> **swap\_used\_mb**: `number`

#### swap\_total\_mb

> **swap\_total\_mb**: `number`

***

### disk

> **disk**: [`DiskMetric`](DiskMetric.md)[]

Defined in: [types.ts:153](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L153)

***

### network

> **network**: [`NetworkMetric`](NetworkMetric.md)[]

Defined in: [types.ts:154](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L154)

***

### processes

> **processes**: [`ProcessMetric`](ProcessMetric.md)[]

Defined in: [types.ts:155](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L155)

***

### os

> **os**: `object`

Defined in: [types.ts:156](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L156)

#### hostname

> **hostname**: `string`

#### uptime\_seconds

> **uptime\_seconds**: `number`

#### kernel

> **kernel**: `string`

#### distro

> **distro**: `string`
