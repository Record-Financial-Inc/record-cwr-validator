// Layer 3 — coded-field lookup validation. For every transaction record, the grammar tells us which
// fields are coded (carry a `source` lookup table); this checks each non-blank coded value against the
// vendored CISAC code list. Emits `warning` (not error) because the vendored tables are CWR 2.1-era and
// a stale list must never hard-reject a valid 2.2 code — see lookup/tables.ts.
// Governing rule: CWR19-1070 the code tables named by each field in its record format table (as specified per field).

import type { CwrIssue } from '../types';
import type { TxRule } from '../context';
import { extractRecord } from '../grammar/extract';
import { isValidCode } from '../lookup/tables';

// publisher_type and writer_designation are already validated at error level by the P3 code rules;
// skip them here so a bad code isn't reported twice.
const COVERED_ELSEWHERE = new Set(['publisher_type', 'writer_designation_code']);

export const lookupCodeRule: TxRule = {
  id: 'LOOKUP_CODE',
  category: 'field',
  layer: 3,
  phase: 7,
  run(ctx) {
    const out: CwrIssue[] = [];
    for (const r of ctx.readable) {
      if (!r.raw) continue; // crafted records without a raw line carry their data in typed fields
      const rec = extractRecord(r.raw);
      if (!rec) continue;
      for (const ef of rec.fields.values()) {
        const src = ef.spec.source;
        if (!src || COVERED_ELSEWHERE.has(src)) continue;
        if (!ef.value) continue; // blank — presence is the field rule's job, not the lookup's
        if (isValidCode(src, ef.value) === false) {
          out.push(ctx.issue('warning', 'field', `${ef.spec.name} "${ef.value}" is not a recognised CWR code.`, [r.line]));
        }
      }
    }
    return out;
  },
};
