[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / Anomaly

# Interface: Anomaly

Defined in: [types.ts:352](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L352)

## Properties

### metric

> **metric**: `string`

Defined in: [types.ts:353](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L353)

***

### severity

> **severity**: `"low"` \| `"medium"` \| `"high"` \| `"critical"`

Defined in: [types.ts:354](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L354)

***

### value

> **value**: `number`

Defined in: [types.ts:355](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L355)

***

### baseline\_mean

> **baseline\_mean**: `number`

Defined in: [types.ts:356](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L356)

***

### z\_score?

> `optional` **z\_score?**: `number`

Defined in: [types.ts:357](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L357)

***

### robust\_z\_score?

> `optional` **robust\_z\_score?**: `number`

Defined in: [types.ts:358](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L358)

***

### baseline\_median?

> `optional` **baseline\_median?**: `number`

Defined in: [types.ts:359](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L359)

***

### normalized\_load\_per\_core?

> `optional` **normalized\_load\_per\_core?**: `number`

Defined in: [types.ts:360](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L360)

***

### confidence?

> `optional` **confidence?**: `number`

Defined in: [types.ts:361](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L361)

***

### root\_cause\_hypothesis?

> `optional` **root\_cause\_hypothesis?**: `string`

Defined in: [types.ts:362](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L362)

***

### evidence?

> `optional` **evidence?**: `string`[]

Defined in: [types.ts:363](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L363)

***

### suggested\_next\_checks?

> `optional` **suggested\_next\_checks?**: `string`[]

Defined in: [types.ts:364](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L364)

***

### explanation

> **explanation**: `string`

Defined in: [types.ts:365](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L365)

***

### recommendation

> **recommendation**: `string`

Defined in: [types.ts:366](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L366)
