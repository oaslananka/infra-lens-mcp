[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / MetricSnapshot

# Interface: MetricSnapshot

Defined in: [types.ts:304](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L304)

## Properties

### timestamp

> **timestamp**: `number`

Defined in: [types.ts:305](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L305)

***

### host

> **host**: `string`

Defined in: [types.ts:306](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L306)

***

### cpu

> **cpu**: `object`

Defined in: [types.ts:307](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L307)

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

Defined in: [types.ts:314](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L314)

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

Defined in: [types.ts:322](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L322)

***

### network

> **network**: [`NetworkMetric`](NetworkMetric.md)[]

Defined in: [types.ts:323](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L323)

***

### system

> **system**: [`SystemMetric`](SystemMetric.md)

Defined in: [types.ts:324](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L324)

***

### processes

> **processes**: [`ProcessMetric`](ProcessMetric.md)[]

Defined in: [types.ts:325](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L325)

***

### os

> **os**: `object`

Defined in: [types.ts:326](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L326)

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

Defined in: [types.ts:332](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L332)
