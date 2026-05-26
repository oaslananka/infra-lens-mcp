[**mcp-infra-lens v1.0.6**](../README.md)

***

[mcp-infra-lens](../README.md) / ToolRegistrar

# Interface: ToolRegistrar

Defined in: [server-core.ts:58](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L58)

## Methods

### registerTool()

> **registerTool**\<`Input`\>(`name`, `config`, `handler`): `void`

Defined in: [server-core.ts:59](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/server-core.ts#L59)

#### Type Parameters

##### Input

`Input`

#### Parameters

##### name

`string`

##### config

[`ToolConfig`](../type-aliases/ToolConfig.md)

##### handler

[`ToolHandler`](../type-aliases/ToolHandler.md)\<`Input`\>

#### Returns

`void`
