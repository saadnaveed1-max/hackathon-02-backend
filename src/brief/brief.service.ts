import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import {
  BRIEF_SYSTEM_PROMPT,
  userPromptForBrief,
  userPromptForRepair,
} from './brief-prompts';
import type { BriefOutput } from './brief-output.types';
import { OpenaiBriefClient } from './openai-brief.client';
import { validateBriefOutput } from './validate-brief-output';

function extractJsonText(content: string): string {
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return trimmed;
}

function tryParseJson(
  text: string,
): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, error: 'Response was not valid JSON.' };
  }
}

@Injectable()
export class BriefService {
  constructor(private readonly openai: OpenaiBriefClient) {}

  async transform(briefText: string): Promise<BriefOutput> {
    const user = userPromptForBrief(briefText);
    let raw = await this.openai.completeJson(BRIEF_SYSTEM_PROMPT, user);
    raw = extractJsonText(raw);

    let parsed = tryParseJson(raw);
    let validation = parsed.ok
      ? validateBriefOutput(parsed.value, briefText)
      : { ok: false as const, errors: [parsed.error] };

    if (!validation.ok) {
      raw = await this.openai.completeJson(
        BRIEF_SYSTEM_PROMPT,
        userPromptForRepair({
          briefText,
          previousOutput: raw,
          errors: validation.errors,
        }),
      );
      raw = extractJsonText(raw);
      parsed = tryParseJson(raw);
      validation = parsed.ok
        ? validateBriefOutput(parsed.value, briefText)
        : { ok: false as const, errors: [parsed.error, ...validation.errors] };
    }

    if (!validation.ok) {
      throw new UnprocessableEntityException({
        message: 'Model output failed validation after repair.',
        errors: validation.errors,
      });
    }

    return validation.data;
  }
}
