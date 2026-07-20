[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / MetricSnapshot

# Interface: MetricSnapshot

Defined in: [types.ts:314](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L314)

## Properties

### timestamp

> **timestamp**: `number`

Defined in: [types.ts:315](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L315)

***

### host

> **host**: `string`

Defined in: [types.ts:316](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L316)

***

### cpu

> **cpu**: `object`

Defined in: [types.ts:317](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L317)

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

Defined in: [types.ts:324](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L324)

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

Defined in: [types.ts:332](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L332)

***

### network

> **network**: [`NetworkMetric`](NetworkMetric.md)[]

Defined in: [types.ts:333](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L333)

***

### system

> **system**: [`SystemMetric`](SystemMetric.md)

Defined in: [types.ts:334](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L334)

***

### processes

> **processes**: [`ProcessMetric`](ProcessMetric.md)[]

Defined in: [types.ts:335](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L335)

***

### os

> **os**: `object`

Defined in: [types.ts:336](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L336)

#### hostname

> **hostname**: `string`

#### uptime\_seconds

> **uptime\_seconds**: `number`

#### kernel

> **kernel**: `string`

#### distro

> **distro**: `string`

***

### warnings

> **warnings**: `string`[]

Defined in: [types.ts:342](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L342)
