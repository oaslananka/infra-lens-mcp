[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / Anomaly

# Interface: Anomaly

Defined in: [types.ts:334](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L334)

## Properties

### metric

> **metric**: `string`

Defined in: [types.ts:335](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L335)

***

### severity

> **severity**: `"low"` \| `"medium"` \| `"high"` \| `"critical"`

Defined in: [types.ts:336](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L336)

***

### value

> **value**: `number`

Defined in: [types.ts:337](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L337)

***

### baseline\_mean

> **baseline\_mean**: `number`

Defined in: [types.ts:338](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L338)

***

### z\_score?

> `optional` **z\_score?**: `number`

Defined in: [types.ts:339](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L339)

***

### robust\_z\_score?

> `optional` **robust\_z\_score?**: `number`

Defined in: [types.ts:340](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L340)

***

### baseline\_median?

> `optional` **baseline\_median?**: `number`

Defined in: [types.ts:341](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L341)

***

### normalized\_load\_per\_core?

> `optional` **normalized\_load\_per\_core?**: `number`

Defined in: [types.ts:342](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L342)

***

### confidence?

> `optional` **confidence?**: `number`

Defined in: [types.ts:343](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L343)

***

### root\_cause\_hypothesis?

> `optional` **root\_cause\_hypothesis?**: `string`

Defined in: [types.ts:344](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L344)

***

### evidence?

> `optional` **evidence?**: `string`[]

Defined in: [types.ts:345](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L345)

***

### suggested\_next\_checks?

> `optional` **suggested\_next\_checks?**: `string`[]

Defined in: [types.ts:346](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L346)

***

### explanation

> **explanation**: `string`

Defined in: [types.ts:347](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L347)

***

### recommendation

> **recommendation**: `string`

Defined in: [types.ts:348](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L348)
