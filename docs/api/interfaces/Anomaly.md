[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / Anomaly

# Interface: Anomaly

Defined in: [types.ts:456](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L456)

## Properties

### metric

> **metric**: `string`

Defined in: [types.ts:457](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L457)

***

### severity

> **severity**: `"low"` \| `"medium"` \| `"high"` \| `"critical"`

Defined in: [types.ts:458](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L458)

***

### value

> **value**: `number`

Defined in: [types.ts:459](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L459)

***

### baseline\_mean

> **baseline\_mean**: `number`

Defined in: [types.ts:460](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L460)

***

### z\_score?

> `optional` **z\_score?**: `number`

Defined in: [types.ts:461](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L461)

***

### robust\_z\_score?

> `optional` **robust\_z\_score?**: `number`

Defined in: [types.ts:462](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L462)

***

### baseline\_median?

> `optional` **baseline\_median?**: `number`

Defined in: [types.ts:463](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L463)

***

### normalized\_load\_per\_core?

> `optional` **normalized\_load\_per\_core?**: `number`

Defined in: [types.ts:464](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L464)

***

### confidence?

> `optional` **confidence?**: `number`

Defined in: [types.ts:465](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L465)

***

### root\_cause\_hypothesis?

> `optional` **root\_cause\_hypothesis?**: `string`

Defined in: [types.ts:466](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L466)

***

### evidence?

> `optional` **evidence?**: `string`[]

Defined in: [types.ts:467](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L467)

***

### suggested\_next\_checks?

> `optional` **suggested\_next\_checks?**: `string`[]

Defined in: [types.ts:468](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L468)

***

### explanation

> **explanation**: `string`

Defined in: [types.ts:469](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L469)

***

### recommendation

> **recommendation**: `string`

Defined in: [types.ts:470](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L470)
