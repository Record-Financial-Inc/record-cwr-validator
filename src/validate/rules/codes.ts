// Layer 3 — CISAC code-table validity for the small complete enumerations, plus E-before-AM chain
// ordering.

import type { CwrIssue } from '../types';
import type { TxRule } from '../context';
import { isPublisher, isWriter } from '../shared';
import { PUBLISHER_ROLES, WRITER_DESIGNATIONS } from '../lookup/codes';

/** SPU/OPU role must be a valid CWR publisher type code. */
export const publisherRoleRule: TxRule = {
  id: 'PUBLISHER_ROLE',
  category: 'field',
  layer: 3,
  phase: 3,
  run(ctx) {
    const out: CwrIssue[] = [];
    for (const r of ctx.readable) {
      if (!isPublisher(r)) continue;
      if (r.role && !PUBLISHER_ROLES.has(r.role)) {
        out.push(ctx.issue('error', 'field', `Publisher role "${r.role}" is not a valid CWR code (E, AM, SE, PA, ES, AQ).`, [r.line]));
      }
    }
    return out;
  },
};

/** SWR/OWR designation must be a valid CWR writer designation code. */
export const writerDesignationRule: TxRule = {
  id: 'WRITER_DESIGNATION',
  category: 'field',
  layer: 3,
  phase: 3,
  run(ctx) {
    const out: CwrIssue[] = [];
    for (const r of ctx.readable) {
      if (!isWriter(r)) continue;
      if (!r.designation) {
        // The designation is mandatory on a controlled writer (SWR); an uncontrolled OWR may omit it.
        if (r.type === 'SWR') {
          out.push(ctx.issue('error', 'field', 'Writer designation is required on a controlled writer (SWR) but is missing.', [r.line]));
        }
      } else if (!WRITER_DESIGNATIONS.has(r.designation)) {
        out.push(ctx.issue('error', 'field', `Writer designation "${r.designation}" is not a valid CWR code (CA, C, A, AR, AD, SR, SA, TR).`, [r.line]));
      }
    }
    return out;
  },
};

/** Within a publisher chain (publisher sequence #), the original publisher (E) must precede its
 *  administrator (AM). */
export const eBeforeAmRule: TxRule = {
  id: 'E_BEFORE_AM',
  category: 'ordering',
  layer: 3,
  phase: 3,
  run(ctx) {
    const out: CwrIssue[] = [];
    const seenE = new Set<number>();
    for (const r of ctx.readable) {
      if (!isPublisher(r)) continue;
      if (r.role === 'E') {
        seenE.add(r.publisherSeq);
      } else if (r.role === 'AM' && !seenE.has(r.publisherSeq)) {
        out.push(ctx.issue('error', 'ordering', `Administrator (AM) in chain ${r.publisherSeq} appears before its original publisher (E).`, [r.line]));
      }
    }
    return out;
  },
};
