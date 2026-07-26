// Layer 3 — CWR 2.2 BNF record order within a transaction:
//   NWR → [SPU/SPT/OPU/OPT]* → [SWR/SWT/PWR/OWR/OWT]* → [ALT]* → [REC/…]
// We assign each record a block rank and require ranks to be non-decreasing through the work. This
// catches gross misordering (e.g. a writer record before the publishers, or REC before the writers)
// without false-positiving on the legitimate intra-block interleaving our generator produces.

import type { CwrRecord } from '../../parse/parse-cwr';
import type { CwrIssue } from '../types';
import type { TxRule } from '../context';
import { isPublisher, isPubTerr, isPwr, isWriter, isWriterTerr } from '../shared';

const RANK: Record<string, number> = {
  NWR: 0, REV: 0,
  SPU: 1, SPT: 1, OPU: 1, OPT: 1,
  SWR: 2, SWT: 2, PWR: 2, OWR: 2, OWT: 2,
  ALT: 3,
  REC: 4, ORN: 4, INS: 4, IND: 4, COM: 4,
};

const rankOf = (r: CwrRecord): number => RANK[r.type] ?? 4;

export const recordOrderRule: TxRule = {
  id: 'BNF_RECORD_ORDER',
  category: 'ordering',
  layer: 3,
  phase: 1,
  run(ctx) {
    const out: CwrIssue[] = [];
    let prevRank = -1;
    let prev: CwrRecord | undefined;
    const seenPublisherIps = new Set<string>();
    const seenControlledPublisherIps = new Set<string>();
    const seenWriterIps = new Set<string>();

    for (const r of ctx.records) {
      const rank = rankOf(r);
      if (rank < prevRank && prev) {
        out.push(ctx.issue('error', 'ordering', `Record ${r.type} is out of CWR order — it appears after ${prev.type}.`, [r.line]));
      }

      if (isPubTerr(r) && r.ip && !seenPublisherIps.has(r.ip)) {
        out.push(ctx.issue('error', 'ordering', `Record ${r.type} appears before its publisher record.`, [r.line]));
      }
      if (isPubTerr(r) && r.type === 'SPT') {
        if (prev && prev.type !== 'SPU' && prev.type !== 'SPT') {
          out.push(ctx.issue('error', 'ordering', `Record SPT must follow an SPU or SPT, but it appears after ${prev.type}.`, [r.line]));
        }
        if (r.ip && !seenControlledPublisherIps.has(r.ip)) {
          out.push(ctx.issue('error', 'ordering', 'Record SPT cannot follow an OPU non-controlled publisher chain.', [r.line]));
        }
      }
      if (isWriterTerr(r) && r.ip && !seenWriterIps.has(r.ip)) {
        out.push(ctx.issue('error', 'ordering', `Record ${r.type} appears before its writer record.`, [r.line]));
      }
      if (isPwr(r)) {
        if (r.publisherIp && !seenPublisherIps.has(r.publisherIp)) {
          out.push(ctx.issue('error', 'ordering', 'Record PWR appears before its linked publisher record.', [r.line]));
        }
        if (r.writerIp && !seenWriterIps.has(r.writerIp)) {
          out.push(ctx.issue('error', 'ordering', 'Record PWR appears before its linked writer record.', [r.line]));
        }
      }

      if (isPublisher(r) && r.ip) {
        seenPublisherIps.add(r.ip);
        if (r.type === 'SPU') seenControlledPublisherIps.add(r.ip);
      }
      if (isWriter(r) && r.ip) seenWriterIps.add(r.ip);
      prevRank = Math.max(prevRank, rank);
      prev = r;
    }
    return out;
  },
};
