[**mcp-infra-lens v1.0.6**](../README.md)

***

[mcp-infra-lens](../README.md) / GetHistorySchema

# Variable: GetHistorySchema

> `const` **GetHistorySchema**: `ZodObject`\<\{ `host`: `ZodString`; `metric`: `ZodDefault`\<`ZodEnum`\<\[`"cpu"`, `"memory"`, `"load"`\]\>\>; `hours`: `ZodDefault`\<`ZodNumber`\>; `label`: `ZodOptional`\<`ZodString`\>; \}, `"strip"`, `ZodTypeAny`, \{ `host`: `string`; `metric`: `"cpu"` \| `"memory"` \| `"load"`; `hours`: `number`; `label?`: `string`; \}, \{ `host`: `string`; `metric?`: `"cpu"` \| `"memory"` \| `"load"`; `hours?`: `number`; `label?`: `string`; \}\>

Defined in: [types.ts:58](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L58)
