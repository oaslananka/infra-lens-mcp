[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / Anomaly

# Interface: Anomaly

Defined in: [types.ts:480](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L480)

## Properties

### metric

> **metric**: `string`

Defined in: [types.ts:481](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L481)

***

### severity

> **severity**: `"low"` \| `"medium"` \| `"high"` \| `"critical"`

Defined in: [types.ts:482](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L482)

***

### value

> **value**: `number`

Defined in: [types.ts:483](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L483)

***

### baseline\_mean

> **baseline\_mean**: `number`

Defined in: [types.ts:484](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L484)

***

### z\_score?

> `optional` **z\_score?**: `number`

Defined in: [types.ts:485](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L485)

***

### robust\_z\_score?

> `optional` **robust\_z\_score?**: `number`

Defined in: [types.ts:486](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L486)

***

### baseline\_median?

> `optional` **baseline\_median?**: `number`

Defined in: [types.ts:487](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L487)

***

### normalized\_load\_per\_core?

> `optional` **normalized\_load\_per\_core?**: `number`

Defined in: [types.ts:488](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L488)

***

### confidence?

> `optional` **confidence?**: `number`

Defined in: [types.ts:489](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L489)

***

### root\_cause\_hypothesis?

> `optional` **root\_cause\_hypothesis?**: `string`

Defined in: [types.ts:490](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L490)

***

### evidence?

> `optional` **evidence?**: `string`[]

Defined in: [types.ts:491](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L491)

***

### suggested\_next\_checks?

> `optional` **suggested\_next\_checks?**: `string`[]

Defined in: [types.ts:492](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L492)

***

### explanation

> **explanation**: `string`

Defined in: [types.ts:493](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L493)

***

### recommendation

> **recommendation**: `string`

Defined in: [types.ts:494](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L494)
