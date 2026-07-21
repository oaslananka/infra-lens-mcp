[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / MetricSnapshot

# Interface: MetricSnapshot

Defined in: [types.ts:418](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L418)

## Properties

### timestamp

> **timestamp**: `number`

Defined in: [types.ts:419](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L419)

***

### host

> **host**: `string`

Defined in: [types.ts:420](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L420)

***

### cpu

> **cpu**: `object`

Defined in: [types.ts:421](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L421)

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

Defined in: [types.ts:428](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L428)

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

Defined in: [types.ts:436](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L436)

***

### network

> **network**: [`NetworkMetric`](NetworkMetric.md)[]

Defined in: [types.ts:437](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L437)

***

### system

> **system**: [`SystemMetric`](SystemMetric.md)

Defined in: [types.ts:438](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L438)

***

### processes

> **processes**: [`ProcessMetric`](ProcessMetric.md)[]

Defined in: [types.ts:439](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L439)

***

### os

> **os**: `object`

Defined in: [types.ts:440](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L440)

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

Defined in: [types.ts:446](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L446)
