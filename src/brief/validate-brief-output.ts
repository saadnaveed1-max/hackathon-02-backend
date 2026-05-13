import {
  BRIEF_OUTPUT_SCHEMA_VERSION,
  type AcceptanceCriterionItem,
  type BriefOutput,
  type WorkItem,
  type WorkItemType,
} from './brief-output.types';

export interface ValidateBriefOutputFailure {
  ok: false;
  errors: string[];
}

export interface ValidateBriefOutputSuccess {
  ok: true;
  data: BriefOutput;
}

export type ValidateBriefOutputResult =
  | ValidateBriefOutputSuccess
  | ValidateBriefOutputFailure;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asNonEmptyString(v: unknown): string | null {
  if (typeof v !== 'string' || v.trim().length === 0) {
    return null;
  }
  return v;
}

/** Collapse whitespace for substring checks (model/brief whitespace may differ). */
export function normalizeForSubstringCheck(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function isQuoteSubstringOfBrief(quote: string, brief: string): boolean {
  const nq = normalizeForSubstringCheck(quote);
  if (nq.length === 0) return false;
  const nb = normalizeForSubstringCheck(brief);
  return nb.includes(nq);
}

function normalizeAcceptanceItem(
  raw: unknown,
  brief: string,
): AcceptanceCriterionItem | null {
  if (!isRecord(raw)) return null;

  const text = typeof raw.text === 'string' ? raw.text.trim() : '';
  const explicitTbd = raw.status === 'tbd';
  const evidenceRaw =
    typeof raw.evidenceQuote === 'string' ? raw.evidenceQuote.trim() : '';

  if (explicitTbd || evidenceRaw.length === 0) {
    return {
      text: text.length > 0 ? text : 'TBD — not specified in brief.',
      evidenceQuote: null,
      status: 'tbd',
    };
  }

  if (!isQuoteSubstringOfBrief(evidenceRaw, brief)) {
    return {
      text: text.length > 0 ? text : 'TBD — not specified in brief.',
      evidenceQuote: null,
      status: 'tbd',
    };
  }

  if (!text) {
    return {
      text: evidenceRaw,
      evidenceQuote: evidenceRaw,
      status: 'stated',
    };
  }

  return { text, evidenceQuote: evidenceRaw, status: 'stated' };
}

function normalizeWorkItem(raw: unknown, brief: string): WorkItem | null {
  if (!isRecord(raw)) return null;
  const id = asNonEmptyString(raw.id);
  const title = asNonEmptyString(raw.title);
  if (!id || !title) return null;

  let parentId: string | null = null;
  if (raw.parentId === null || raw.parentId === undefined) {
    parentId = null;
  } else if (typeof raw.parentId === 'string' && raw.parentId.trim()) {
    parentId = raw.parentId.trim();
  }

  const typeRaw =
    typeof raw.type === 'string' && raw.type.trim()
      ? raw.type.trim().toLowerCase()
      : 'task';
  const type: WorkItemType =
    typeRaw === 'epic' || typeRaw === 'story' || typeRaw === 'task'
      ? typeRaw
      : 'task';

  const description =
    typeof raw.description === 'string' ? raw.description.trim() : '';

  const acRaw = raw.acceptanceCriteria;
  const acceptanceCriteria: AcceptanceCriterionItem[] = [];
  if (Array.isArray(acRaw)) {
    for (const line of acRaw) {
      const item = normalizeAcceptanceItem(line, brief);
      if (item) acceptanceCriteria.push(item);
    }
  }

  return {
    id,
    parentId,
    type,
    title: title.trim(),
    description,
    acceptanceCriteria,
  };
}

/**
 * Validates and normalizes LLM JSON into BriefOutput.
 * Returns 422-level errors if the payload is structurally unusable.
 */
export function validateBriefOutput(
  parsed: unknown,
  originalBrief: string,
): ValidateBriefOutputResult {
  const errors: string[] = [];

  if (!isRecord(parsed)) {
    return { ok: false, errors: ['Root value must be a JSON object.'] };
  }

  const schemaVersion = parsed.schemaVersion;
  if (schemaVersion !== BRIEF_OUTPUT_SCHEMA_VERSION) {
    errors.push(
      `schemaVersion must be ${BRIEF_OUTPUT_SCHEMA_VERSION} (got ${String(schemaVersion)}).`,
    );
  }

  const workItemsRaw = parsed.workItems;
  if (!Array.isArray(workItemsRaw)) {
    errors.push('workItems must be an array.');
    return { ok: false, errors };
  }

  const workItems: WorkItem[] = [];
  for (let i = 0; i < workItemsRaw.length; i++) {
    const w = normalizeWorkItem(workItemsRaw[i], originalBrief);
    if (!w) {
      errors.push(`workItems[${i}] is invalid (missing id or title).`);
    } else {
      workItems.push(w);
    }
  }

  if (workItems.length === 0) {
    errors.push('workItems must contain at least one valid item.');
  }

  let gaps: string[] = [];
  if (parsed.gaps === undefined) {
    gaps = [];
  } else if (!Array.isArray(parsed.gaps)) {
    errors.push('gaps must be an array of strings when present.');
  } else {
    const gapsArr = parsed.gaps as unknown[];
    for (let i = 0; i < gapsArr.length; i++) {
      const g: unknown = gapsArr[i];
      if (typeof g !== 'string' || !g.trim()) {
        errors.push(`gaps[${i}] must be a non-empty string.`);
      } else {
        gaps.push(g.trim());
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const summary =
    typeof parsed.summary === 'string' && parsed.summary.trim()
      ? parsed.summary.trim()
      : undefined;
  const assumptionsPolicy =
    typeof parsed.assumptionsPolicy === 'string' &&
    parsed.assumptionsPolicy.trim()
      ? parsed.assumptionsPolicy.trim()
      : undefined;

  const data: BriefOutput = {
    schemaVersion: BRIEF_OUTPUT_SCHEMA_VERSION,
    summary,
    assumptionsPolicy,
    workItems,
    gaps,
  };

  return { ok: true, data };
}
