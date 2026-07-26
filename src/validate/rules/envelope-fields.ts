// Layer 4: field validation for the envelope records HDR/GRH/GRT/TRL. The grammar-driven field rules
// (FIELD_FORMAT, LOOKUP_CODE) are Layer 3 and only see transaction records, so these "simple" records :
// which carry the submitter, dates, CWR version, group/transaction type and counts: previously got NO
// field validation beyond HEADER_SENDER_ID. This closes that hole: it runs the same datatype + lookup
// checks on the envelope records. Format defects emit `error` (a garbage date/count is a hard reject);
// unrecognised codes emit `warning` (the lookup tables are 2.1-era: see lookup/tables.ts).
// Governing rule: CWR19-1070 the record format tables for HDR, GRH, GRT and TRL (§3.5-§3.8) (as specified per field).

import type { CwrIssue } from '../types';
import type { FileRule } from '../context';
import { extractRecord } from '../grammar/extract';
import { checkDatatype, FORMAT_DATATYPES } from '../grammar/datatypes';
import { isValidCode } from '../lookup/tables';

const ENVELOPE_HEADS = new Set(['HDR', 'GRH', 'GRT', 'TRL']);

export const envelopeFieldRule: FileRule = {
  id: 'ENVELOPE_FIELD',
  category: 'field',
  layer: 4,
  phase: 15,
  run(ctx) {
    const out: CwrIssue[] = [];
    for (const r of ctx.readable) {
      if (!ENVELOPE_HEADS.has(r.type)) continue;
      const rec = extractRecord(r.raw);
      if (!rec) continue;
      for (const ef of rec.fields.values()) {
        if (!ef.value) continue;
        if (FORMAT_DATATYPES.has(ef.spec.datatype)) {
          const reason = checkDatatype(ef.spec.datatype, ef.value);
          if (reason) out.push(ctx.issue('error', 'field', `${ef.spec.name} (${rec.head}) "${ef.value}" ${reason}.`, [r.line]));
        }
        if (ef.spec.source && isValidCode(ef.spec.source, ef.value) === false) {
          out.push(ctx.issue('warning', 'field', `${ef.spec.name} (${rec.head}) "${ef.value}" is not a recognised CWR code.`, [r.line]));
        }
      }
    }
    return out;
  },
};
