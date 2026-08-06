// Layer 4: the submitter work number must be unique across the whole transmission. CISAC keys a
// registration on the submitter work #, so the same value on two NWR/REV transactions is an ambiguous
// double-registration a society rejects. The per-transaction rules can't see this; a file rule can.
// Governing rule: CWR19-1070 §4.2 p25 transaction rule 13 (TR).

import type { CwrIssue } from '../types';
import type { FileRule } from '../context';
import { isWork } from '../shared';

export const duplicateWorkRule: FileRule = {
  id: 'DUPLICATE_WORK',
  category: 'duplicate',
  layer: 4,
  phase: 15,
  run(ctx) {
    const out: CwrIssue[] = [];
    const firstLine = new Map<string, number>();
    for (const r of ctx.readable) {
      if (!isWork(r) || !r.submitterWorkId) continue;
      const prev = firstLine.get(r.submitterWorkId);
      if (prev != null) {
        out.push(ctx.issue('error', 'duplicate', `Submitter work # "${r.submitterWorkId}" appears in more than one transaction.`, [prev, r.line], 'TR'));
      } else {
        firstLine.set(r.submitterWorkId, r.line);
      }
    }
    return out;
  },
};
