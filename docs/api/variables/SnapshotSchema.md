[**mcp-infra-lens v1.0.6**](../README.md)

***

[mcp-infra-lens](../README.md) / SnapshotSchema

# Variable: SnapshotSchema

> `const` **SnapshotSchema**: `ZodObject`\<\{ `connection`: `ZodObject`\<\{ `host`: `ZodString`; `port`: `ZodDefault`\<`ZodNumber`\>; `username`: `ZodString`; `password`: `ZodOptional`\<`ZodString`\>; `privateKey`: `ZodOptional`\<`ZodString`\>; `passphrase`: `ZodOptional`\<`ZodString`\>; `hostKeySha256`: `ZodOptional`\<`ZodString`\>; `knownHostsPath`: `ZodOptional`\<`ZodString`\>; \}, `"strip"`, `ZodTypeAny`, \{ `host`: `string`; `port`: `number`; `username`: `string`; `password?`: `string`; `privateKey?`: `string`; `passphrase?`: `string`; `hostKeySha256?`: `string`; `knownHostsPath?`: `string`; \}, \{ `host`: `string`; `port?`: `number`; `username`: `string`; `password?`: `string`; `privateKey?`: `string`; `passphrase?`: `string`; `hostKeySha256?`: `string`; `knownHostsPath?`: `string`; \}\>; \}, `"strip"`, `ZodTypeAny`, \{ `connection`: \{ `host`: `string`; `port`: `number`; `username`: `string`; `password?`: `string`; `privateKey?`: `string`; `passphrase?`: `string`; `hostKeySha256?`: `string`; `knownHostsPath?`: `string`; \}; \}, \{ `connection`: \{ `host`: `string`; `port?`: `number`; `username`: `string`; `password?`: `string`; `privateKey?`: `string`; `passphrase?`: `string`; `hostKeySha256?`: `string`; `knownHostsPath?`: `string`; \}; \}\>

Defined in: [types.ts:39](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L39)
