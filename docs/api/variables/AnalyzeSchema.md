[**mcp-infra-lens v1.0.6**](../README.md)

***

[mcp-infra-lens](../README.md) / AnalyzeSchema

# Variable: AnalyzeSchema

> `const` **AnalyzeSchema**: `ZodObject`\<\{ `connection`: `ZodObject`\<\{ `host`: `ZodString`; `port`: `ZodDefault`\<`ZodNumber`\>; `username`: `ZodString`; `password`: `ZodOptional`\<`ZodString`\>; `privateKey`: `ZodOptional`\<`ZodString`\>; `passphrase`: `ZodOptional`\<`ZodString`\>; `hostKeySha256`: `ZodOptional`\<`ZodString`\>; `knownHostsPath`: `ZodOptional`\<`ZodString`\>; \}, `"strip"`, `ZodTypeAny`, \{ `host`: `string`; `port`: `number`; `username`: `string`; `password?`: `string`; `privateKey?`: `string`; `passphrase?`: `string`; `hostKeySha256?`: `string`; `knownHostsPath?`: `string`; \}, \{ `host`: `string`; `port?`: `number`; `username`: `string`; `password?`: `string`; `privateKey?`: `string`; `passphrase?`: `string`; `hostKeySha256?`: `string`; `knownHostsPath?`: `string`; \}\>; `duration_minutes`: `ZodDefault`\<`ZodNumber`\>; `include_processes`: `ZodDefault`\<`ZodBoolean`\>; `include_network`: `ZodDefault`\<`ZodBoolean`\>; \}, `"strip"`, `ZodTypeAny`, \{ `connection`: \{ `host`: `string`; `port`: `number`; `username`: `string`; `password?`: `string`; `privateKey?`: `string`; `passphrase?`: `string`; `hostKeySha256?`: `string`; `knownHostsPath?`: `string`; \}; `duration_minutes`: `number`; `include_processes`: `boolean`; `include_network`: `boolean`; \}, \{ `connection`: \{ `host`: `string`; `port?`: `number`; `username`: `string`; `password?`: `string`; `privateKey?`: `string`; `passphrase?`: `string`; `hostKeySha256?`: `string`; `knownHostsPath?`: `string`; \}; `duration_minutes?`: `number`; `include_processes?`: `boolean`; `include_network?`: `boolean`; \}\>

Defined in: [types.ts:26](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L26)
