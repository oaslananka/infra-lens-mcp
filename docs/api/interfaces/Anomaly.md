[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / Anomaly

# Interface: Anomaly

Defined in: [types.ts:342](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L342)

## Properties

### metric

> **metric**: `string`

Defined in: [types.ts:343](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L343)

***

### severity

> **severity**: `"low"` \| `"medium"` \| `"high"` \| `"critical"`

Defined in: [types.ts:344](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L344)

***

### value

> **value**: `number`

Defined in: [types.ts:345](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L345)

***

### baseline\_mean

> **baseline\_mean**: `number`

Defined in: [types.ts:346](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L346)

***

### z\_score?

> `optional` **z\_score?**: `number`

Defined in: [types.ts:347](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L347)

***

### robust\_z\_score?

> `optional` **robust\_z\_score?**: `number`

Defined in: [types.ts:348](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L348)

***

### baseline\_median?

> `optional` **baseline\_median?**: `number`

Defined in: [types.ts:349](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L349)

***

### normalized\_load\_per\_core?

> `optional` **normalized\_load\_per\_core?**: `number`

Defined in: [types.ts:350](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L350)

***

### confidence?

> `optional` **confidence?**: `number`

Defined in: [types.ts:351](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L351)

***

### root\_cause\_hypothesis?

> `optional` **root\_cause\_hypothesis?**: `string`

Defined in: [types.ts:352](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L352)

***

### evidence?

> `optional` **evidence?**: `string`[]

Defined in: [types.ts:353](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L353)

***

### suggested\_next\_checks?

> `optional` **suggested\_next\_checks?**: `string`[]

Defined in: [types.ts:354](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L354)

***

### explanation

> **explanation**: `string`

Defined in: [types.ts:355](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L355)

***

### recommendation

> **recommendation**: `string`

Defined in: [types.ts:356](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L356)
