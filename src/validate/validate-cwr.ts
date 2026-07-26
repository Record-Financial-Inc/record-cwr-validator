// CWR file validator — the orchestrator behind the Registration portal, the catalogue pre-flight,
// and the automatic export gate. It parses the file once (core/parsers/cwr-parser.ts), then runs the
// registry's rules in layer order: Layer 4 (file/group) once, then Layer 3 (transaction) per work.
// Independent of our generator, so it catches the defects a society rejects.

import { parseCwr, type CwrRecord } from '../parse/parse-cwr';
import type { CwrIssue, CwrValidationResult } from './types';
import { makeFileContext, makeTxContext } from './context';
import { FILE_RULE_LIST, TX_RULE_LIST } from './registry';
import { isWork } from './shared';

/** Validate a raw CWR file string. Returns errors (block submission) and warnings. */
export function validateCwr(content: string): CwrValidationResult {
  const parsed = parseCwr(content);
  const { records, transactionCount } = parsed;

  // Empty file — nothing to validate; short-circuit with a single file-level structural error.
  if (records.length === 0) {
    return {
      ok: false,
      errors: [{ severity: 'error', category: 'structure', message: 'File is empty — no CWR records found.', records: [], txSeq: null }],
      warnings: [],
      recordCount: 0,
      transactionCount: 0,
    };
  }

  const all: CwrIssue[] = [];

  // Layer 4 — file/group rules (run once over the whole file).
  const fileCtx = makeFileContext(parsed);
  for (const rule of FILE_RULE_LIST) all.push(...rule.run(fileCtx));

  // Layer 3 — transaction rules (run per work, in file order).
  for (const ctx of transactionContexts(records)) {
    for (const rule of TX_RULE_LIST) all.push(...rule.run(ctx));
  }

  const errors = all.filter((i) => i.severity === 'error');
  const warnings = all.filter((i) => i.severity === 'warning');
  return { ok: errors.length === 0, errors, warnings, recordCount: records.length, transactionCount };
}

/** Group records by transaction (NWR sequence) in file order, binding each work's title. */
function* transactionContexts(records: CwrRecord[]) {
  const byTx = new Map<number, CwrRecord[]>();
  for (const r of records) {
    if (r.txSeq == null) continue;
    const bucket = byTx.get(r.txSeq);
    if (bucket) bucket.push(r);
    else byTx.set(r.txSeq, [r]);
  }
  for (const [txSeq, recs] of byTx) {
    const work = recs.find(isWork);
    const workTitle = work && 'title' in work ? work.title : undefined;
    yield makeTxContext(txSeq, workTitle, recs);
  }
}
