[**mcp-infra-lens v1.0.6**](../README.md)

***

[mcp-infra-lens](../README.md) / GetHistorySchema

# Variable: GetHistorySchema

> `const` **GetHistorySchema**: `ZodObject`\<\{ `host`: `ZodString`; `metric`: `ZodDefault`\<`ZodEnum`\<\{ `cpu`: `"cpu"`; `memory`: `"memory"`; `load`: `"load"`; \}\>\>; `hours`: `ZodDefault`\<`ZodNumber`\>; `label`: `ZodOptional`\<`ZodString`\>; \}, `$strip`\>

Defined in: [types.ts:58](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L58)
