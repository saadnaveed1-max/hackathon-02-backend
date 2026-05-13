import { BRIEF_OUTPUT_SCHEMA_VERSION } from './brief-output.types';

export const BRIEF_SYSTEM_PROMPT = `You are a senior PMO analyst. Your job is to turn a client brief into structured developer-ready work items.

Rules (strict):
- Never invent scope, features, integrations, timelines, tech stack, environments, or acceptance criteria that are not grounded in the brief text.
- Every acceptance criterion with status "stated" MUST include evidenceQuote copied verbatim from the brief (a substring that appears exactly in the brief). If you cannot quote the brief, use status "tbd" and put clarifying questions in gaps instead of guessing.
- If important detail is missing, add concise client-facing questions to gaps[] — do not fill gaps with assumptions.
- workItems must form a tree: use parentId null for roots; children reference parent id strings.
- Use types epic, story, or task as appropriate.
- Output MUST be a single JSON object only (no markdown fences, no commentary).`;

const JSON_SHAPE = `{
  "schemaVersion": ${BRIEF_OUTPUT_SCHEMA_VERSION},
  "summary": "optional one-line restatement using only brief wording",
  "assumptionsPolicy": "optional: short note that you did not add unstated requirements",
  "workItems": [
    {
      "id": "unique_string",
      "parentId": null,
      "type": "epic",
      "title": "",
      "description": "",
      "acceptanceCriteria": [
        { "text": "", "evidenceQuote": "verbatim from brief", "status": "stated" },
        { "text": "Why this matters / TBD", "status": "tbd" }
      ]
    }
  ],
  "gaps": ["Client question 1", "Client question 2"]
}`;

export function userPromptForBrief(briefText: string): string {
  return `Transform the following client brief into JSON matching this exact shape (field names and schemaVersion are required):

${JSON_SHAPE}

Client brief is between <<<BRIEF>>> and <<<END BRIEF>>>:

<<<BRIEF>>>
${briefText}
<<<END BRIEF>>>`;
}

export function userPromptForRepair(params: {
  briefText: string;
  previousOutput: string;
  errors: string[];
}): string {
  return `The previous model output was invalid or failed validation.

Validation errors:
${params.errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Return ONLY a single valid JSON object (no markdown) with the same shape as before: schemaVersion ${BRIEF_OUTPUT_SCHEMA_VERSION}, workItems (at least one), gaps (array of strings, can be empty).

Rules: fix structure only; do not add new requirements beyond what the brief supports; keep evidenceQuote as verbatim substrings of the brief when status is stated.

Broken output:
${params.previousOutput}

Original brief:
<<<BRIEF>>>
${params.briefText}
<<<END BRIEF>>>`;
}
