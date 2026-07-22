[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / ToolRequestContext

# Interface: ToolRequestContext

Defined in: [server-core.ts:64](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L64)

Transport-neutral lifecycle context for one tool request.

## Properties

### signal?

> `optional` **signal?**: `AbortSignal`

Defined in: [server-core.ts:65](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L65)

***

### reportProgress?

> `optional` **reportProgress?**: (`progress`) => `void` \| `Promise`\<`void`\>

Defined in: [server-core.ts:66](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L66)

#### Parameters

##### progress

[`SamplingProgress`](SamplingProgress.md)

#### Returns

`void` \| `Promise`\<`void`\>
