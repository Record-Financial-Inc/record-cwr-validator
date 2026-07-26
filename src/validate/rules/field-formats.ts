// Layer 3 — field format validity. Phase 1 covers the IPI Name Number (9–11 digits), the one
// identifier our generator always writes and a society validates against the CISAC registry. ISWC/ISRC/
// date/duration formats land in a later phase (their CWR field encodings need care).

import type { CwrIssue } from '../types';
import type { TxRule } from '../context';
import { isPublisher, isWriter } from '../shared';
import { IPI_REGEX } from '../../internal/ipi';

export const ipiFormatRule: TxRule = {
  id: 'FIELD_IPI',
  category: 'field',
  layer: 3,
  phase: 1,
  run(ctx) {
    const out: CwrIssue[] = [];
    for (const r of ctx.readable) {
      if (!isPublisher(r) && !isWriter(r)) continue;
      // IPI is optional on a record, but if present it must be well-formed.
      if (r.ipi && !IPI_REGEX.test(r.ipi)) {
        out.push(ctx.issue('error', 'field', `IPI "${r.ipi}" is malformed — an IPI Name Number is 9–11 digits.`, [r.line]));
      }
    }
    return out;
  },
};
