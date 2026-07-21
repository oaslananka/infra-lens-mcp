[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / IncidentWindowComparisonOutputSchema

# Variable: IncidentWindowComparisonOutputSchema

> `const` **IncidentWindowComparisonOutputSchema**: `ZodObject`\<\{ `left_label`: `ZodString`; `right_label`: `ZodString`; `left`: `ZodObject`\<\{ `host`: `ZodString`; `sample_count`: `ZodNumber`; `from`: `ZodNullable`\<`ZodNumber`\>; `to`: `ZodNullable`\<`ZodNumber`\>; `cpu`: `ZodObject`\<\{ `average`: `ZodNumber`; `maximum`: `ZodNumber`; \}, `$strip`\>; `memory`: `ZodObject`\<\{ `average`: `ZodNumber`; `maximum`: `ZodNumber`; \}, `$strip`\>; `load`: `ZodObject`\<\{ `average`: `ZodNumber`; `maximum`: `ZodNumber`; \}, `$strip`\>; \}, `$strip`\>; `right`: `ZodObject`\<\{ `host`: `ZodString`; `sample_count`: `ZodNumber`; `from`: `ZodNullable`\<`ZodNumber`\>; `to`: `ZodNullable`\<`ZodNumber`\>; `cpu`: `ZodObject`\<\{ `average`: `ZodNumber`; `maximum`: `ZodNumber`; \}, `$strip`\>; `memory`: `ZodObject`\<\{ `average`: `ZodNumber`; `maximum`: `ZodNumber`; \}, `$strip`\>; `load`: `ZodObject`\<\{ `average`: `ZodNumber`; `maximum`: `ZodNumber`; \}, `$strip`\>; \}, `$strip`\>; `left_invalid_rows`: `ZodNumber`; `right_invalid_rows`: `ZodNumber`; `metrics`: `ZodArray`\<`ZodObject`\<\{ `metric`: `ZodEnum`\<\{ `cpu_percent`: `"cpu_percent"`; `load_1`: `"load_1"`; `memory_percent`: `"memory_percent"`; \}\>; `left`: `ZodNumber`; `right`: `ZodNumber`; `delta`: `ZodNumber`; `direction`: `ZodEnum`\<\{ `increased`: `"increased"`; `decreased`: `"decreased"`; `stable`: `"stable"`; \}\>; \}, `$strip`\>\>; `summary`: `ZodString`; `review_required`: `ZodLiteral`\<`true`\>; \}, `$strip`\>

Defined in: [types.ts:287](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L287)
