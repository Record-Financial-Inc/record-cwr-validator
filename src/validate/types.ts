// Public types for the CWR validation engine. Re-exported from `core/validation/cwr-validator.ts`
// (the stable import path): keep this the single source of the CwrIssue contract (invariant I1).

export type CwrSeverity = 'error' | 'warning';

/**
 * The specification's own severity grading, which says WHAT THE SOCIETY REFUSES.
 *
 * This is not our `severity`. `severity` says whether we block the export; the grade says how much
 * of the file the society takes down, and only the grade can answer "what happens to my file":
 *
 *   ER  Entire File Rejected      nothing in the file registers, and no acknowledgement comes back
 *   GR  Group Rejected            one group of registrations is refused
 *   TR  Transaction Rejected      one work is refused, the rest register
 *   RR  Record Rejected           one line is dropped, the work still registers
 *   FR  Field Rejected            one field is ignored, the work still registers
 *
 * Typed rather than read from the message, for the reason `unverified` is typed: a surface must be
 * able to tell an ER from a GR without parsing prose. The verdict previously matched
 * /ER: entire file rejected/ against the message text, which worked only for the findings that
 * happened to carry a citation.
 */
export type CwrGrade = 'ER' | 'GR' | 'TR' | 'RR' | 'FR';

/**
 * The one source of category names. Deriving `CwrIssueCategory` from this `as const` array gives us
 * a runtime list (for coverage tests + the UI ORDER exhaustiveness check, invariant I4) AND the
 * compile-time union. Add new categories here as their phase lands.
 */
export const CWR_ISSUE_CATEGORIES = [
  'overclaim',
  'duplicate',
  'territory',
  'structure',
  'header',
  // P1: the "…" beyond a society's three named examples.
  'count', // GRT/TRL record + transaction counts vs the actual file
  'link', // PWR (publisher↔writer) chain completeness + integrity
  'mandatory', // a required field is absent
  'field', // a field's format is invalid (e.g. a malformed IPI)
  'ordering', // records out of CWR 2.2 BNF order within a transaction
  // P2: sequence numbering + interested-party uniqueness.
  'sequence', // transaction / record sequence numbers not strictly increasing
] as const;
export type CwrIssueCategory = (typeof CWR_ISSUE_CATEGORIES)[number];

export interface CwrIssue {
  severity: CwrSeverity;
  category: CwrIssueCategory;
  message: string;
  /** 1-based line numbers of the offending record(s). */
  records: number[];
  /** The work (transaction) this issue belongs to; `null` for file/group-scoped issues (invariant I2). */
  txSeq?: number | null;
  workTitle?: string;
  /**
   * How many records carry this same finding, when identical findings have been collapsed into one.
   * Absent means one. `records` then holds the first few line numbers rather than all of them, and
   * `truncatedRecords` says so.
   */
  occurrences?: number;
  /** True when `records` lists only the first of `occurrences` lines. */
  truncatedRecords?: boolean;
  /**
   * The specification's severity grading for the rule this finding breaks. Absent when the rule has
   * not declared one and its message carries no citation to read it from; a consumer must treat an
   * absent grade as "unknown", never as "harmless".
   */
  grade?: CwrGrade;
  /**
   * This is a check that could not be RUN, not a defect that was found: the reference data it
   * needs was not supplied. It is reported rather than passed over in silence, because an
   * unverifiable ER-severity check is not a pass. Typed rather than inferred from the message, so a
   * surface can tell "we looked and it is fine" from "we could not look" without reading prose.
   */
  unverified?: boolean;
}

/**
 * How many findings a list represents, counting collapsed repeats.
 *
 * `errors.length` is the number of finding OBJECTS, which is not the number of findings: identical
 * ones are merged into a single entry carrying `occurrences`. Counting objects understates a real
 * file badly: one submission reported 447 ordering defects that were actually 708. Any surface
 * that shows a count to a person should use this.
 */
export function issueCount(issues: readonly CwrIssue[]): number {
  return issues.reduce((total, issue) => total + (issue.occurrences ?? 1), 0);
}

export interface CwrValidationResult {
  ok: boolean;
  errors: CwrIssue[];
  warnings: CwrIssue[];
  recordCount: number;
  transactionCount: number;
}
