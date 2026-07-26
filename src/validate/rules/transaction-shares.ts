// Layer 3 — transaction-level share and composition rules (CWR19-1070 §4.2).
//
//   Trans 4  (TR, p24) Total ownership across all SPU and OPU must be at most 50% for PR, and at
//                      most 100% for MR and SR.
//   Trans 9  (TR, p25) Total ownership across all SWR and OWR must be either 0% or at least 50%
//                      for PR.
//   Trans 15 (TR, p25) A work must contain at least one writer designated composer or author
//                      ("CA", "A" or "C").
//   Trans 17 (TR, p25) A publisher chain may contain only one Original Publisher ("E").
//
// Rules 4 and 9 are one idea stated from both sides: the performance right splits between the
// writers and their publishers, and the writers' half is theirs. A publisher side above 50%, or a
// writer side below it, means the writers have been assigned more of their performance right than
// the standard contemplates. The existing ownership total rule cannot see this — it checks that
// everything sums to 100%, and a work where publishers hold 70% and writers 30% sums perfectly.

import type { PublisherRecord } from '../../parse/parse-cwr';
import type { CwrIssue } from '../types';
import type { TxRule } from '../context';
import { isPublisher, isWriter, TOLERANCE } from '../shared';

/** Writer designation codes that make someone a composer or author of the work itself. */
const AUTHORSHIP_CODES = new Set(['CA', 'A', 'C']);
/** The publisher side of the performance right may not exceed half (§4.2 p24 transaction rule 4). */
const PUBLISHER_PR_CAP = 0.5;

export const transactionSharesRule: TxRule = {
  id: 'TRANSACTION_SHARES',
  category: 'overclaim',
  layer: 3,
  phase: 7,
  run(ctx) {
    const out: CwrIssue[] = [];
    const publishers = ctx.readable.filter(isPublisher);
    const writers = ctx.readable.filter(isWriter);
    if (publishers.length === 0 && writers.length === 0) return out;

    const sum = (records: { ownership: Record<'pr' | 'mr' | 'sr', number> }[], right: 'pr' | 'mr' | 'sr') =>
      records.reduce((total, r) => total + (r.ownership[right] ?? 0), 0);

    // Trans 4 — the publisher side of the performance right is capped at half.
    const publisherPr = sum(publishers, 'pr');
    if (publisherPr > PUBLISHER_PR_CAP + TOLERANCE) {
      out.push(ctx.issue('error', 'overclaim', `Publishers hold ${(publisherPr * 100).toFixed(2)}% of the performance right, above the 50% ceiling. The performance right splits between writers and their publishers, and the writers' half is not assignable (CWR19-1070 §4.2 p24 transaction rule 4, TR — transaction rejected).`, publishers.map((p) => p.line).slice(0, 6)));
    }
    for (const right of ['mr', 'sr'] as const) {
      const total = sum(publishers, right);
      if (total > 1 + TOLERANCE) {
        out.push(ctx.issue('error', 'overclaim', `Publishers hold ${(total * 100).toFixed(2)}% of the ${right === 'mr' ? 'mechanical' : 'sync'} right, above 100% (CWR19-1070 §4.2 p24 transaction rule 4, TR — transaction rejected).`, publishers.map((p) => p.line).slice(0, 6)));
      }
    }

    // Trans 9 — the writer side of the performance right is all of it, at least half of it, or none.
    const writerPr = sum(writers, 'pr');
    if (writerPr > TOLERANCE && writerPr < PUBLISHER_PR_CAP - TOLERANCE) {
      out.push(ctx.issue('error', 'overclaim', `Writers hold ${(writerPr * 100).toFixed(2)}% of the performance right, which must be either 0% or at least 50% (CWR19-1070 §4.2 p25 transaction rule 9, TR — transaction rejected).`, writers.map((w) => w.line).slice(0, 6)));
    }

    // Trans 15 — somebody has to have written it.
    if (writers.length > 0 && !writers.some((w) => AUTHORSHIP_CODES.has((w.designation ?? '').trim()))) {
      out.push(ctx.issue('error', 'overclaim', `No writer is designated composer or author. A work must carry at least one writer with designation "CA", "A" or "C" (CWR19-1070 §4.2 p25 transaction rule 15, TR — transaction rejected).`, writers.map((w) => w.line).slice(0, 6)));
    }

    // Trans 17 — a chain of title has exactly one origin.
    const chains = new Map<number, PublisherRecord[]>();
    for (const p of publishers) {
      const chain = chains.get(p.publisherSeq);
      if (chain) chain.push(p);
      else chains.set(p.publisherSeq, [p]);
    }
    for (const [seq, chain] of chains) {
      const originals = chain.filter((p) => p.role === 'E');
      if (originals.length > 1) {
        out.push(ctx.issue('error', 'overclaim', `Chain ${seq} contains ${originals.length} Original Publishers ("E"). A chain of title has one origin (CWR19-1070 §4.2 p25 transaction rule 17, TR — transaction rejected).`, originals.map((p) => p.line).slice(0, 6)));
      }
    }

    return out;
  },
};
