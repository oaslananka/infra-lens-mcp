[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / RemediationStepSchema

# Variable: RemediationStepSchema

> `const` **RemediationStepSchema**: `ZodObject`\<\{ `id`: `ZodString`; `priority`: `ZodEnum`\<\{ `low`: `"low"`; `medium`: `"medium"`; `high`: `"high"`; `critical`: `"critical"`; \}\>; `metric`: `ZodString`; `title`: `ZodString`; `proposed_action`: `ZodString`; `rationale`: `ZodString`; `evidence`: `ZodArray`\<`ZodString`\>; `confidence`: `ZodNumber`; `verification`: `ZodArray`\<`ZodString`\>; `rollback_guidance`: `ZodString`; `requires_approval`: `ZodLiteral`\<`true`\>; \}, `$strip`\>

Defined in: [types.ts:260](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L260)
