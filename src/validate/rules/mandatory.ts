// Layer 3 — mandatory field presence per record type (the CWR 2.2 "M" fields a society needs to
// process a registration). Each missing field is one issue, scoped to its work.
// Governing rule: CWR19-1070 §5.4 p40 and §5.9 p47 mandatory field validations (TR).

import type { CwrIssue } from '../types';
import type { TxRule } from '../context';
import { isWork, isWriter, isPublisher, isPwr } from '../shared';

export const mandatoryRule: TxRule = {
  id: 'MANDATORY_FIELDS',
  category: 'mandatory',
  layer: 3,
  phase: 1,
  run(ctx) {
    const out: CwrIssue[] = [];
    const miss = (cond: boolean, what: string, line: number) => {
      if (cond) out.push(ctx.issue('error', 'mandatory', `${what} is required but missing.`, [line]));
    };
    for (const r of ctx.readable) {
      if (isWork(r)) {
        miss(!r.title, 'Work title (NWR)', r.line);
        miss(!r.submitterWorkId, 'Submitter work # (NWR)', r.line);
      } else if (isWriter(r) && r.type === 'SWR') {
        // Controlled writers must be named; uncontrolled (OWR) may be "unknown".
        miss(!r.lastName, 'Writer last name (SWR)', r.line);
      } else if (isPublisher(r)) {
        miss(!r.name, 'Publisher name (SPU/OPU)', r.line);
        miss(!r.role, 'Publisher role (SPU/OPU)', r.line);
      } else if (isPwr(r)) {
        miss(!r.publisherIp, 'Publisher IP (PWR)', r.line);
      }
    }
    return out;
  },
};
