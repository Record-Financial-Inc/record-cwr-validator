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

/**
 * Datatypes that are never data: intentional spacers and the record type itself. A blank one is the
 * file doing what the specification asks, not a field somebody forgot.
 */
const NOT_DATA = new Set(['blank', 'record_type']);

/**
 * Fields whose absence a dedicated rule already reports, in its own words.
 *
 * HEADER_SENDER_ID says the submitter cannot be identified, which is the consequence, and a second
 * generic "is required but missing" beside it reads as two defects rather than one.
 */
const REPORTED_ELSEWHERE = new Set(['sender_id']);

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
        if (!ef.value) {
          // The presence half. Until this, exactly one mandatory envelope field was checked for
          // presence (the Sender ID, by hand), so the submitter's name, the creation date, the CWR
          // version and every trailer count could all be blank and the file still returned ok.
          // ENVELOPE_FIELD skips an empty value below because its other job is the shape of a value
          // that IS there; MANDATORY_FIELD does presence but is a TxRule and never reaches the
          // envelope. The gap was not a missing check so much as nobody owning it.
          if (ef.spec.presence === 'M' && !NOT_DATA.has(ef.spec.datatype) && !REPORTED_ELSEWHERE.has(ef.spec.key)) {
            // The HDR identifies the sender, and §3.5 grades its field validations ER: the society
            // refuses the file before it reads a work. A group header or trailer takes its group down.
            out.push(ctx.issue('error', 'mandatory', `${ef.spec.name} (${rec.head}) is required but missing.`, [r.line], rec.head === 'HDR' ? 'ER' : 'GR'));
          }
          continue;
        }
        if (FORMAT_DATATYPES.has(ef.spec.datatype)) {
          const reason = checkDatatype(ef.spec.datatype, ef.value);
          if (reason) out.push(ctx.issue('error', 'field', `${ef.spec.name} (${rec.head}) "${ef.value}" ${reason}.`, [r.line], rec.head === 'HDR' ? 'ER' : 'GR'));
        }
        if (ef.spec.source && isValidCode(ef.spec.source, ef.value) === false) {
          // An unrecognised code is a field defect, and the table is 2.1-era, so this stays FR.
          out.push(ctx.issue('warning', 'field', `${ef.spec.name} (${rec.head}) "${ef.value}" is not a recognised CWR code.`, [r.line], 'FR'));
        }
      }
    }
    return out;
  },
};
