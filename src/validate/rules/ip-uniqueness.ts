// Layer 3: interested-party (#) uniqueness within a transaction. Each distinct party (publisher or
// writer) must have its own IP within the work; the same IP on two party records means a party was
// listed twice: a generalisation of the "duplicated SPU" defect a society flagged. (Territory records
// SPT/SWT legitimately reuse their party's IP, so they're not counted here.)
// Governing rule: CWR19-1070 §5.4 p40 field validation 3 (TR).

import type { CwrIssue } from '../types';
import type { TxRule } from '../context';
import { isPublisher, isWriter } from '../shared';

export const ipUniqueRule: TxRule = {
  id: 'IP_UNIQUE_IN_TX',
  category: 'duplicate',
  layer: 3,
  phase: 2,
  run(ctx) {
    const out: CwrIssue[] = [];
    const seen = new Map<string, number>(); // ip → first line
    for (const r of ctx.readable) {
      if (!isPublisher(r) && !isWriter(r)) continue;
      if (!r.ip) continue; // blank IPs can't be de-duplicated
      const prev = seen.get(r.ip);
      if (prev !== undefined) {
        out.push(ctx.issue('error', 'duplicate', `Interested-party # "${r.ip}" is used by two parties in the work: each publisher/writer needs a distinct IP.`, [prev, r.line]));
      } else {
        seen.set(r.ip, r.line);
      }
    }
    return out;
  },
};
