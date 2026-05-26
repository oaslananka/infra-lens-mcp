[**mcp-infra-lens v1.0.6**](../README.md)

***

[mcp-infra-lens](../README.md) / SafeConnectionSchema

# Variable: SafeConnectionSchema

> `const` **SafeConnectionSchema**: `ZodObject`\<`Omit`\<\{ `host`: `ZodString`; `port`: `ZodDefault`\<`ZodNumber`\>; `username`: `ZodString`; `password`: `ZodOptional`\<`ZodString`\>; `privateKey`: `ZodOptional`\<`ZodString`\>; `passphrase`: `ZodOptional`\<`ZodString`\>; `hostKeySha256`: `ZodOptional`\<`ZodString`\>; `knownHostsPath`: `ZodOptional`\<`ZodString`\>; \}, `"password"` \| `"privateKey"` \| `"passphrase"`\>, `"strict"`, `ZodTypeAny`, \{ `host`: `string`; `port`: `number`; `username`: `string`; `hostKeySha256?`: `string`; `knownHostsPath?`: `string`; \}, \{ `host`: `string`; `port?`: `number`; `username`: `string`; `hostKeySha256?`: `string`; `knownHostsPath?`: `string`; \}\>

Defined in: [types.ts:20](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L20)
