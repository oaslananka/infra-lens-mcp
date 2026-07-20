[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / InspectCapabilitiesOutputSchema

# Variable: InspectCapabilitiesOutputSchema

> `const` **InspectCapabilitiesOutputSchema**: `ZodObject`\<\{ `host`: `ZodString`; `checked_at`: `ZodString`; `capabilities`: `ZodArray`\<`ZodObject`\<\{ `name`: `ZodString`; `available`: `ZodBoolean`; `source`: `ZodString`; `detail`: `ZodOptional`\<`ZodString`\>; \}, `$strip`\>\>; `warnings`: `ZodArray`\<`ZodString`\>; \}, `$strip`\>

Defined in: [types.ts:199](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L199)
