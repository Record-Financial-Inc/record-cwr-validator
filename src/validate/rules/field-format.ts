// Layer 3: datatype/format validation. For every transaction record the grammar tells us each field's
// datatype; this checks that numeric/percentage/date/time/flag/boolean fields are well-formed. A
// malformed date or non-numeric count is an unambiguous CWR defect that a society rejects, so this emits
// `error`: and the round-trip suite proves a generated CWR never trips it. Presence (mandatory/
// conditional) and identifier check digits are separate rules.
// Governing rule: CWR19-1070 the per-field datatype and range given in each record format table (as specified per field).

import type { CwrIssue } from '../types';
import type { TxRule } from '../context';
import { extractRecord } from '../grammar/extract';
import { checkDatatype, FORMAT_DATATYPES } from '../grammar/datatypes';

const SHARE_MAX: Record<string, number> = {
  'SPU.pr_ownership_share': 5000,
  'OPU.pr_ownership_share': 5000,
  'SPU.mr_ownership_share': 10000,
  'OPU.mr_ownership_share': 10000,
  'SPU.sr_ownership_share': 10000,
  'OPU.sr_ownership_share': 10000,
  'SPT.pr_collection_share': 5000,
  'OPT.pr_collection_share': 5000,
  'SPT.mr_collection_share': 10000,
  'OPT.mr_collection_share': 10000,
  'SPT.sr_collection_share': 10000,
  'OPT.sr_collection_share': 10000,
  'SWR.pr_ownership_share': 10000,
  'OWR.pr_ownership_share': 10000,
  'SWR.mr_ownership_share': 10000,
  'OWR.mr_ownership_share': 10000,
  'SWR.sr_ownership_share': 10000,
  'OWR.sr_ownership_share': 10000,
  'SWT.pr_collection_share': 10000,
  'OWT.pr_collection_share': 10000,
  'SWT.mr_collection_share': 10000,
  'OWT.mr_collection_share': 10000,
  'SWT.sr_collection_share': 10000,
  'OWT.sr_collection_share': 10000,
};

function shareRangeIssue(head: string, fieldKey: string, value: string): string | null {
  const max = SHARE_MAX[`${head}.${fieldKey}`];
  if (max === undefined || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric > max ? `must be between 00000 and ${max.toString().padStart(5, '0')}` : null;
}

export const fieldFormatRule: TxRule = {
  id: 'FIELD_FORMAT',
  category: 'field',
  layer: 3,
  phase: 8,
  run(ctx) {
    const out: CwrIssue[] = [];
    for (const r of ctx.readable) {
      if (!r.raw) continue;
      const rec = extractRecord(r.raw);
      if (!rec) continue;
      for (const ef of rec.fields.values()) {
        if (!FORMAT_DATATYPES.has(ef.spec.datatype)) continue;
        const reason = checkDatatype(ef.spec.datatype, ef.value);
        if (reason) {
          out.push(ctx.issue('error', 'field', `${ef.spec.name} "${ef.value}" ${reason}.`, [r.line]));
        }
        const rangeIssue = shareRangeIssue(rec.head, ef.spec.key, ef.value);
        if (rangeIssue) {
          out.push(ctx.issue('error', 'field', `${ef.spec.name} "${ef.value}" ${rangeIssue}.`, [r.line]));
        }
      }
    }
    return out;
  },
};
