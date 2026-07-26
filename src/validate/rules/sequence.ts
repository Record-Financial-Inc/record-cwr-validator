// Sequence numbering. CWR numbers transactions across the file and records within each transaction;
// a society rejects gaps/duplicates/out-of-order sequences. The transaction sequence must START AT 0 and be
// fully contiguous (each = previous + 1, catching duplicates, resets, reordering AND gaps). A 1-based
// start reads as "off by one" to strict ingesters (a society could not upload our earlier 1-based file), so
// the start value is now enforced too. Record sequence is 0-based per transaction.
// Governing rule: CWR19-1070 §2.1 p8-9 field validations 2-8 (ER).

import type { CwrIssue } from '../types';
import type { FileRule, TxRule } from '../context';
import { isWork } from '../shared';

const recSeqOf = (raw: string): number => {
  const n = parseInt(raw.slice(11, 19), 10); // record sequence # field: type(3) + txSeq(8) + recSeq(8)
  return Number.isNaN(n) ? NaN : n;
};

/** Layer 4 — NWR/REV transaction sequence numbers must strictly increase through the file. */
export const txSequenceRule: FileRule = {
  id: 'TX_SEQUENCE',
  category: 'sequence',
  layer: 4,
  phase: 2,
  run(ctx) {
    const out: CwrIssue[] = [];
    let prev: number | null = null;
    for (const w of ctx.records) {
      if (!isWork(w) || w.txSeq == null) continue;
      if (prev === null) {
        // The first transaction in the group must be sequence 0 (CWR transaction sequence is 0-based).
        if (w.txSeq !== 0) {
          out.push(ctx.issue('error', 'sequence', `First transaction sequence is ${w.txSeq} — NWR sequence numbers must start at 0.`, [w.line]));
        }
      } else if (w.txSeq <= prev) {
        out.push(ctx.issue('error', 'sequence', `Transaction sequence ${w.txSeq} does not increase past the previous (${prev}) — NWR sequence numbers must be ordered and unique.`, [w.line]));
      } else if (w.txSeq !== prev + 1) {
        out.push(ctx.issue('error', 'sequence', `Transaction sequence jumps from ${prev} to ${w.txSeq} — NWR sequence numbers must be contiguous (no gaps).`, [w.line]));
      }
      prev = w.txSeq;
    }
    return out;
  },
};

/** Layer 3 — record sequence numbers must strictly increase within a transaction. */
export const recordSequenceRule: TxRule = {
  id: 'RECORD_SEQUENCE',
  category: 'sequence',
  layer: 3,
  phase: 2,
  run(ctx) {
    const out: CwrIssue[] = [];
    // Mirror txSequenceRule: record sequence is 0-based per transaction and must be fully contiguous, so a
    // zero start and a gap are both errors, not just a non-increasing value. a society rejects gaps/resets the
    // same way it rejects duplicates and reordering.
    let prev: number | null = null;
    for (const r of ctx.records) {
      const rs = recSeqOf(r.raw);
      if (Number.isNaN(rs)) continue; // records without a parseable seq (e.g. crafted test records)
      if (prev === null) {
        if (rs !== 0) {
          out.push(ctx.issue('error', 'sequence', `First record sequence is ${rs}: record sequence numbers must start at 0 within the work.`, [r.line]));
        }
      } else if (rs <= prev) {
        out.push(ctx.issue('error', 'sequence', `Record sequence ${rs} does not increase past the previous (${prev}) within the work.`, [r.line]));
      } else if (rs !== prev + 1) {
        out.push(ctx.issue('error', 'sequence', `Record sequence jumps from ${prev} to ${rs}: record sequence numbers must be contiguous (no gaps) within the work.`, [r.line]));
      }
      prev = rs;
    }
    return out;
  },
};
