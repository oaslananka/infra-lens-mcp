[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / AnalyzeSnapshotSchema

# Variable: AnalyzeSnapshotSchema

> `const` **AnalyzeSnapshotSchema**: `ZodObject`\<\{ `connection`: `ZodObject`\<\{ `host`: `ZodString`; `port`: `ZodDefault`\<`ZodNumber`\>; `username`: `ZodString`; `password`: `ZodOptional`\<`ZodString`\>; `privateKey`: `ZodOptional`\<`ZodString`\>; `passphrase`: `ZodOptional`\<`ZodString`\>; `hostKeySha256`: `ZodOptional`\<`ZodString`\>; `knownHostsPath`: `ZodOptional`\<`ZodString`\>; \}, `$strip`\>; `include_processes`: `ZodDefault`\<`ZodBoolean`\>; `include_network`: `ZodDefault`\<`ZodBoolean`\>; \}, `$strip`\>

Defined in: [types.ts:26](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L26)
