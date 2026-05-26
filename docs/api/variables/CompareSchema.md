[**mcp-infra-lens v1.0.6**](../README.md)

***

[mcp-infra-lens](../README.md) / CompareSchema

# Variable: CompareSchema

> `const` **CompareSchema**: `ZodObject`\<\{ `connection`: `ZodObject`\<\{ `host`: `ZodString`; `port`: `ZodDefault`\<`ZodNumber`\>; `username`: `ZodString`; `password`: `ZodOptional`\<`ZodString`\>; `privateKey`: `ZodOptional`\<`ZodString`\>; `passphrase`: `ZodOptional`\<`ZodString`\>; `hostKeySha256`: `ZodOptional`\<`ZodString`\>; `knownHostsPath`: `ZodOptional`\<`ZodString`\>; \}, `"strip"`, `ZodTypeAny`, \{ `host`: `string`; `port`: `number`; `username`: `string`; `password?`: `string`; `privateKey?`: `string`; `passphrase?`: `string`; `hostKeySha256?`: `string`; `knownHostsPath?`: `string`; \}, \{ `host`: `string`; `port?`: `number`; `username`: `string`; `password?`: `string`; `privateKey?`: `string`; `passphrase?`: `string`; `hostKeySha256?`: `string`; `knownHostsPath?`: `string`; \}\>; `baseline_label`: `ZodDefault`\<`ZodString`\>; \}, `"strip"`, `ZodTypeAny`, \{ `connection`: \{ `host`: `string`; `port`: `number`; `username`: `string`; `password?`: `string`; `privateKey?`: `string`; `passphrase?`: `string`; `hostKeySha256?`: `string`; `knownHostsPath?`: `string`; \}; `baseline_label`: `string`; \}, \{ `connection`: \{ `host`: `string`; `port?`: `number`; `username`: `string`; `password?`: `string`; `privateKey?`: `string`; `passphrase?`: `string`; `hostKeySha256?`: `string`; `knownHostsPath?`: `string`; \}; `baseline_label?`: `string`; \}\>

Defined in: [types.ts:51](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L51)
