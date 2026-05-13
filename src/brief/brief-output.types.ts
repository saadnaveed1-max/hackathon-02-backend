/** Contract version for API responses and exports. */
export const BRIEF_OUTPUT_SCHEMA_VERSION = 1 as const;

/** Acceptance line: either tied to brief evidence or explicitly TBD. */
export type AcceptanceCriterionStatus = 'stated' | 'tbd';

export interface AcceptanceCriterionItem {
  /** What “done” means for this line (may be empty if status is tbd). */
  text: string;
  /** Verbatim substring from the client brief; required when status is stated. */
  evidenceQuote?: string | null;
  status: AcceptanceCriterionStatus;
}

export type WorkItemType = 'epic' | 'story' | 'task';

export interface WorkItem {
  id: string;
  /** null or omit for root-level items */
  parentId: string | null;
  type: WorkItemType;
  title: string;
  description: string;
  acceptanceCriteria: AcceptanceCriterionItem[];
}

export interface BriefOutput {
  schemaVersion: typeof BRIEF_OUTPUT_SCHEMA_VERSION;
  summary?: string;
  assumptionsPolicy?: string;
  workItems: WorkItem[];
  gaps: string[];
}
