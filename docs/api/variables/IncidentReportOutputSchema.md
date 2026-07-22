[**infra-lens-mcp**](../README.md)

***

[infra-lens-mcp](../README.md) / IncidentReportOutputSchema

# Variable: IncidentReportOutputSchema

> `const` **IncidentReportOutputSchema**: `ZodObject`\<\{ `status`: `ZodLiteral`\<`"draft"`\>; `review_required`: `ZodLiteral`\<`true`\>; `host`: `ZodString`; `generated_at`: `ZodString`; `window`: `ZodObject`\<\{ `from`: `ZodNumber`; `to`: `ZodNumber`; \}, `$strip`\>; `sample_count`: `ZodNumber`; `invalid_rows`: `ZodNumber`; `completeness`: `ZodEnum`\<\{ `complete`: `"complete"`; `partial`: `"partial"`; `incomplete`: `"incomplete"`; \}\>; `executive_summary`: `ZodString`; `impact_signals`: `ZodArray`\<`ZodString`\>; `detection_evidence`: `ZodArray`\<`ZodString`\>; `timeline`: `ZodArray`\<`ZodObject`\<\{ `kind`: `ZodEnum`\<\{ `first_observation`: `"first_observation"`; `peak_cpu`: `"peak_cpu"`; `peak_memory`: `"peak_memory"`; `latest_observation`: `"latest_observation"`; \}\>; `timestamp`: `ZodNumber`; `detail`: `ZodString`; \}, `$strip`\>\>; `remediation`: `ZodObject`\<\{ `host`: `ZodString`; `generated_at`: `ZodString`; `health_score`: `ZodNumber`; `summary`: `ZodString`; `confidence`: `ZodNumber`; `review_required`: `ZodLiteral`\<`true`\>; `execution_performed`: `ZodLiteral`\<`false`\>; `steps`: `ZodArray`\<`ZodObject`\<\{ `id`: `ZodString`; `priority`: `ZodEnum`\<\{ `low`: `"low"`; `medium`: `"medium"`; `high`: `"high"`; `critical`: `"critical"`; \}\>; `metric`: `ZodString`; `title`: `ZodString`; `proposed_action`: `ZodString`; `rationale`: `ZodString`; `evidence`: `ZodArray`\<`ZodString`\>; `confidence`: `ZodNumber`; `verification`: `ZodArray`\<`ZodString`\>; `rollback_guidance`: `ZodString`; `requires_approval`: `ZodLiteral`\<`true`\>; \}, `$strip`\>\>; \}, `$strip`\>; `postmortem`: `ZodObject`\<\{ `contributing_factors`: `ZodArray`\<`ZodString`\>; `what_went_well`: `ZodArray`\<`ZodString`\>; `improvement_actions`: `ZodArray`\<`ZodString`\>; `open_questions`: `ZodArray`\<`ZodString`\>; \}, `$strip`\>; \}, `$strip`\>

Defined in: [types.ts:315](https://github.com/oaslananka/infra-lens-mcp/blob/main/src/types.ts#L315)
