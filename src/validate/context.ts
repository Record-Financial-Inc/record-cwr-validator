// Rule contexts + the `issue()` factory that enforces invariant I2 (txSeq stamping).
//
// A rule is a pure `run(ctx) => CwrIssue[]`. Rules never build a CwrIssue literal — they call
// `ctx.issue(...)`, and the context stamps `txSeq`/`workTitle`. This makes it structurally
// impossible for a transaction rule to forget the txSeq the export gate relies on, and impossible
// for a file/group rule to attach one.

import type { ParsedCwr, CwrRecord } from '../parse/parse-cwr';
import type { CwrIssue, CwrIssueCategory, CwrSeverity } from './types';

export type IssueFactory = (
  severity: CwrSeverity,
  category: CwrIssueCategory,
  message: string,
  records: number[],
) => CwrIssue;

/**
 * Every context exposes two views of the same records, and the choice between them is the rule
 * author's to make explicitly:
 *
 * - `records` — every record. Use for anything derived from the record TYPE or the 19-char
 *   sequence prefix: framing, ordering, trailer counts, transaction sequence, record presence.
 *   These survive a broken tail, and a malformed record must still be counted and ordered.
 * - `readable` — records whose framing holds, so their field offsets are meaningful. Use for
 *   anything that reads a FIELD: shares, territories, IPIs, names, links, formats, lookups.
 *
 * Reading a field off a malformed record yields whatever bytes sit at that offset. Asserting a
 * rights defect from those bytes is a fabrication, so the split is enforced by making every rule
 * pick a side rather than by filtering invisibly inside the type guards (which `ordering` and
 * `required-records` legitimately use for type identity on malformed records).
 */

/** Whole-file context (Layer 4 — framing/header/counts). Issues carry `txSeq: null`. */
export interface FileContext {
  parsed: ParsedCwr;
  records: CwrRecord[];
  readable: CwrRecord[];
  issue: IssueFactory;
}

/** One work's records (Layer 3 — shares/territories/links). Issues carry this work's `txSeq`. */
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
    // File/group issues describe the envelope, not a work — never per-work-excludable (I2).
    issue: (severity, category, message, records) => ({ severity, category, message, records, txSeq: null }),
  };
}

export function makeTxContext(txSeq: number, workTitle: string | undefined, records: CwrRecord[]): TxContext {
  return {
    txSeq,
    workTitle,
    records,
    readable: records.filter((r) => r.framingOk),
    // Transaction issues auto-carry txSeq + workTitle so the export gate worklists exactly the
    // offending work — a rule author cannot forget to stamp it (I2).
    issue: (severity, category, message, recs) => ({ severity, category, message, records: recs, txSeq, workTitle }),
  };
}
