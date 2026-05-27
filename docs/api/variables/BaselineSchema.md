[**mcp-infra-lens v1.0.6**](../README.md)

***

[mcp-infra-lens](../README.md) / BaselineSchema

# Variable: BaselineSchema

> `const` **BaselineSchema**: `ZodObject`\<\{ `connection`: `ZodObject`\<\{ `host`: `ZodString`; `port`: `ZodDefault`\<`ZodNumber`\>; `username`: `ZodString`; `password`: `ZodOptional`\<`ZodString`\>; `privateKey`: `ZodOptional`\<`ZodString`\>; `passphrase`: `ZodOptional`\<`ZodString`\>; `hostKeySha256`: `ZodOptional`\<`ZodString`\>; `knownHostsPath`: `ZodOptional`\<`ZodString`\>; \}, `$strip`\>; `label`: `ZodDefault`\<`ZodString`\>; \}, `$strip`\>

Defined in: [types.ts:43](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L43)
