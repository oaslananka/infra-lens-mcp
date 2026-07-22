[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / SamplingControl

# Interface: SamplingControl

Defined in: [types.ts:373](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L373)

Optional lifecycle controls for a sampled collection.

## Properties

### signal?

> `optional` **signal?**: `AbortSignal`

Defined in: [types.ts:374](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L374)

***

### onProgress?

> `optional` **onProgress?**: (`progress`) => `void` \| `Promise`\<`void`\>

Defined in: [types.ts:375](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L375)

#### Parameters

##### progress

[`SamplingProgress`](SamplingProgress.md)

#### Returns

`void` \| `Promise`\<`void`\>
