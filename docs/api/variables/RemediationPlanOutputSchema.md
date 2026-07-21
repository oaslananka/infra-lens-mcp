[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / RemediationPlanOutputSchema

# Variable: RemediationPlanOutputSchema

> `const` **RemediationPlanOutputSchema**: `ZodObject`\<\{ `host`: `ZodString`; `generated_at`: `ZodString`; `health_score`: `ZodNumber`; `summary`: `ZodString`; `confidence`: `ZodNumber`; `review_required`: `ZodLiteral`\<`true`\>; `execution_performed`: `ZodLiteral`\<`false`\>; `steps`: `ZodArray`\<`ZodObject`\<\{ `id`: `ZodString`; `priority`: `ZodEnum`\<\{ `low`: `"low"`; `medium`: `"medium"`; `high`: `"high"`; `critical`: `"critical"`; \}\>; `metric`: `ZodString`; `title`: `ZodString`; `proposed_action`: `ZodString`; `rationale`: `ZodString`; `evidence`: `ZodArray`\<`ZodString`\>; `confidence`: `ZodNumber`; `verification`: `ZodArray`\<`ZodString`\>; `rollback_guidance`: `ZodString`; `requires_approval`: `ZodLiteral`\<`true`\>; \}, `$strip`\>\>; \}, `$strip`\>

Defined in: [types.ts:266](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L266)
