// Rule contexts + the `issue()` factory that enforces invariant I2 (txSeq stamping).
//
// A rule is a pure `run(ctx) => CwrIssue[]`. Rules never build a CwrIssue literal: they call
// `ctx.issue(...)`, and the context stamps `txSeq`/`workTitle`. This makes it structurally
// impossible for a transaction rule to forget the txSeq the export gate relies on, and impossible
// for a file/group rule to attach one.

import type { ParsedCwr, CwrRecord } from '../parse/parse-cwr';
import type { CwrIssue, CwrIssueCategory, CwrGrade, CwrSeverity } from './types';

/**
 * Read the specification's grade out of the citation a message carries.
 *
 * Messages end with a citation this engine writes in a fixed shape, for example
 * "(CWR19-1070 §3.5 p14 field validation 3, ER: entire file rejected)". That suffix is a format we
 * control, not prose we are guessing at, and `group-by-rule.ts` already splits it off to state a
 * rule once.
 *
 * Deriving it here rather than at 127 call sites means a rule that cites its source is graded for
 * free. A rule whose message carries no citation must pass `grade` explicitly; the guard in
 * `tests/unit/core/validation/cwr/grade-coverage.test.ts` fails when neither is true.
 */
const CITED_GRADE = /,\s*(ER|GR|TR|RR|FR):\s/;

function gradeFromCitation(message: string): CwrGrade | undefined {
  return (CITED_GRADE.exec(message)?.[1] as CwrGrade | undefined) ?? undefined;
}

export type IssueFactory = (
  severity: CwrSeverity,
  category: CwrIssueCategory,
  message: string,
  records: number[],
  /** The specification's grade, when the message carries no citation to read it from. */
  grade?: CwrGrade,
) => CwrIssue;

/**
 * Every context exposes two views of the same records, and the choice between them is the rule
 * author's to make explicitly:
 *
 * - `records`: every record. Use for anything derived from the record TYPE or the 19-char
 *   sequence prefix: framing, ordering, trailer counts, transaction sequence, record presence.
 *   These survive a broken tail, and a malformed record must still be counted and ordered.
 * - `readable`: records whose framing holds, so their field offsets are meaningful. Use for
 *   anything that reads a FIELD: shares, territories, IPIs, names, links, formats, lookups.
 *
 * Reading a field off a malformed record yields whatever bytes sit at that offset. Asserting a
 * rights defect from those bytes is a fabrication, so the split is enforced by making every rule
 * pick a side rather than by filtering invisibly inside the type guards (which `ordering` and
 * `required-records` legitimately use for type identity on malformed records).
 */

/** Whole-file context (Layer 4: framing/header/counts). Issues carry `txSeq: null`. */
export interface FileContext {
  parsed: ParsedCwr;
  records: CwrRecord[];
  readable: CwrRecord[];
  issue: IssueFactory;
}

/** One work's records (Layer 3: shares/territories/links). Issues carry this work's `txSeq`. */
export interface TxContext {
  txSeq: number;
  workTitle?: string;
  records: CwrRecord[];
  readable: CwrRecord[];
  issue: IssueFactory;
}

export interface FileRule {
  id: string;
  category: CwrIssueCategory;
  layer: 4;
  phase: number;
  run(ctx: FileContext): CwrIssue[];
}
export interface TxRule {
  id: string;
  category: CwrIssueCategory;
  layer: 3;
  phase: number;
  run(ctx: TxContext): CwrIssue[];
}
export type CwrRule = FileRule | TxRule;

export function makeFileContext(parsed: ParsedCwr): FileContext {
  return {
    parsed,
    records: parsed.records,
    readable: parsed.records.filter((r) => r.framingOk),
    // File/group issues describe the envelope, not a work: never per-work-excludable (I2).
    issue: (severity, category, message, records, grade) => ({
      severity,
      category,
      message,
      records,
      txSeq: null,
      grade: grade ?? gradeFromCitation(message),
    }),
  };
}

export function makeTxContext(txSeq: number, workTitle: string | undefined, records: CwrRecord[]): TxContext {
  return {
    txSeq,
    workTitle,
    records,
    readable: records.filter((r) => r.framingOk),
    // Transaction issues auto-carry txSeq + workTitle so the export gate worklists exactly the
    // offending work: a rule author cannot forget to stamp it (I2).
    issue: (severity, category, message, recs, grade) => ({
      severity,
      category,
      message,
      records: recs,
      txSeq,
      workTitle,
      grade: grade ?? gradeFromCitation(message),
    }),
  };
}
