import { BRIEF_OUTPUT_SCHEMA_VERSION } from './brief-output.types';
import {
  isQuoteSubstringOfBrief,
  normalizeForSubstringCheck,
  validateBriefOutput,
} from './validate-brief-output';

describe('validateBriefOutput', () => {
  const brief = 'The client needs a login page for managers.';

  it('accepts a minimal valid payload', () => {
    const parsed = {
      schemaVersion: BRIEF_OUTPUT_SCHEMA_VERSION,
      workItems: [
        {
          id: 'w1',
          parentId: null,
          type: 'task',
          title: 'Login page',
          description: 'Per brief',
          acceptanceCriteria: [
            {
              text: 'Managers can access login',
              evidenceQuote: 'login page for managers',
              status: 'stated',
            },
          ],
        },
      ],
      gaps: ['Which IdP?'],
    };
    const r = validateBriefOutput(parsed, brief);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.workItems).toHaveLength(1);
      expect(r.data.gaps).toEqual(['Which IdP?']);
    }
  });

  it('rejects when workItems is not an array', () => {
    const r = validateBriefOutput(
      { schemaVersion: BRIEF_OUTPUT_SCHEMA_VERSION, workItems: {}, gaps: [] },
      brief,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.includes('workItems'))).toBe(true);
    }
  });

  it('rejects when no valid work items', () => {
    const r = validateBriefOutput(
      {
        schemaVersion: BRIEF_OUTPUT_SCHEMA_VERSION,
        workItems: [{ id: '', title: 'x' }],
        gaps: [],
      },
      brief,
    );
    expect(r.ok).toBe(false);
  });

  it('downgrades AC to tbd when evidence is not a substring of the brief', () => {
    const parsed = {
      schemaVersion: BRIEF_OUTPUT_SCHEMA_VERSION,
      workItems: [
        {
          id: 'w1',
          parentId: null,
          type: 'task',
          title: 'Login page',
          description: '',
          acceptanceCriteria: [
            {
              text: 'OAuth with Google',
              evidenceQuote: 'OAuth with Google',
              status: 'stated',
            },
          ],
        },
      ],
      gaps: [],
    };
    const r = validateBriefOutput(parsed, brief);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const ac = r.data.workItems[0].acceptanceCriteria[0];
      expect(ac.status).toBe('tbd');
      expect(ac.evidenceQuote).toBeNull();
    }
  });
});

describe('isQuoteSubstringOfBrief', () => {
  it('matches with different whitespace', () => {
    const brief = 'Hello   world\n test';
    expect(isQuoteSubstringOfBrief('hello world test', brief)).toBe(true);
  });

  it('normalizes for comparison', () => {
    expect(normalizeForSubstringCheck('  A  B  ')).toBe('a b');
  });
});
