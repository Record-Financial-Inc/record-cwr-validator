// Layer 3 — data-driven mandatory-field presence. The grammar marks every field's presence (M/C/O);
// this flags any M (mandatory) field left blank on a transaction record, for every record type at once.
// It complements the typed `mandatoryRule` (P1), which handles the title/name/role fields with their
// conditional nuances (an OWR may be "unknown", a publisher name is conditional on the unknown flag);
// those keys are skipped here to avoid double-reporting. Blank/constant filler fields are skipped — they
// are intentionally spaces. Emits `error`; the round-trip suite proves a generated CWR never trips it.
// Governing rule: CWR19-1070 the M (mandatory) marking in each record format table (as specified per field).

import type { CwrIssue } from '../types';
import type { TxRule } from '../context';
import { extractRecord } from '../grammar/extract';

// Handled by the typed mandatoryRule (P1), with its conditional logic — don't re-check here.
const COVERED_BY_P1 = new Set(['work_title', 'submitter_work_n', 'writer_last_name', 'publisher_ip_n']);
// Always-present structural fields / intentional spacers — never "missing".
const NOT_DATA = new Set(['blank', 'record_type']);

export const mandatoryFieldRule: TxRule = {
  id: 'MANDATORY_FIELD',
  category: 'mandatory',
  layer: 3,
  phase: 14,
  run(ctx) {
    const out: CwrIssue[] = [];
    for (const r of ctx.readable) {
      if (!r.raw) continue;
      const rec = extractRecord(r.raw);
      if (!rec) continue;
      for (const ef of rec.fields.values()) {
        if (ef.spec.presence !== 'M') continue;
        if (NOT_DATA.has(ef.spec.datatype) || COVERED_BY_P1.has(ef.spec.key)) continue;
        if (ef.value === '') {
          out.push(ctx.issue('error', 'mandatory', `${ef.spec.name} (${rec.head}) is required but missing.`, [r.line]));
        }
      }
    }
    return out;
  },
};
