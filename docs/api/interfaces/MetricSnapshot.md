[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / MetricSnapshot

# Interface: MetricSnapshot

Defined in: [types.ts:442](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L442)

## Properties

### timestamp

> **timestamp**: `number`

Defined in: [types.ts:443](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L443)

***

### host

> **host**: `string`

Defined in: [types.ts:444](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L444)

***

### cpu

> **cpu**: `object`

Defined in: [types.ts:445](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L445)

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

Defined in: [types.ts:452](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L452)

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

Defined in: [types.ts:460](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L460)

***

### network

> **network**: [`NetworkMetric`](NetworkMetric.md)[]

Defined in: [types.ts:461](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L461)

***

### system

> **system**: [`SystemMetric`](SystemMetric.md)

Defined in: [types.ts:462](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L462)

***

### processes

> **processes**: [`ProcessMetric`](ProcessMetric.md)[]

Defined in: [types.ts:463](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L463)

***

### os

> **os**: `object`

Defined in: [types.ts:464](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L464)

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

Defined in: [types.ts:470](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L470)
