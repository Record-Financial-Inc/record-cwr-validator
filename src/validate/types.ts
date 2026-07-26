// Public types for the CWR validation engine. Re-exported from `core/validation/cwr-validator.ts`
// (the stable import path) — keep this the single source of the CwrIssue contract (invariant I1).

export type CwrSeverity = 'error' | 'warning';

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
  // P1 — the "…" beyond a society's three named examples.
  'count', // GRT/TRL record + transaction counts vs the actual file
  'link', // PWR (publisher↔writer) chain completeness + integrity
  'mandatory', // a required field is absent
  'field', // a field's format is invalid (e.g. a malformed IPI)
  'ordering', // records out of CWR 2.2 BNF order within a transaction
  // P2 — sequence numbering + interested-party uniqueness.
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
}

export interface CwrValidationResult {
  ok: boolean;
  errors: CwrIssue[];
  warnings: CwrIssue[];
  recordCount: number;
  transactionCount: number;
}
