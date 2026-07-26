// Layer 3 — identifier check digits. A length/format check passes a transposed IPI or ISWC; the
// check digit catches it. Driven off the grammar's datatype (ipi_name_n / ipi_base_n / iswc) so it
// covers every party identifier on every record without per-field wiring.
//
// Severity `warning`: a failing check digit is worth surfacing, but our catalogue holds IPIs from many
// sources whose canonical form we haven't audited end-to-end, so it must not hard-block an export.
// Promote to `error` once a catalogue-wide IPI/ISWC check-digit cleanup confirms our data is clean.
// Governing rule: CWR19-1070 §5.4 p41 field validation 10 and §5.9 p47 field validation 9 (FR).

import type { CwrIssue } from '../types';
import type { TxRule } from '../context';
import { extractRecord } from '../grammar/extract';
import { validateIpiName, validateIpiBase, validateIswcCheckDigit } from '../lookup/check-digits';

const VALIDATORS: Record<string, (v: string) => boolean | null> = {
  ipi_name_n: validateIpiName,
  ipi_base_n: validateIpiBase,
  iswc: validateIswcCheckDigit,
};

export const checkDigitRule: TxRule = {
  id: 'CHECK_DIGIT',
  category: 'field',
  layer: 3,
  phase: 9,
  run(ctx) {
    const out: CwrIssue[] = [];
    for (const r of ctx.readable) {
      if (!r.raw) continue;
      const rec = extractRecord(r.raw);
      if (!rec) continue;
      for (const ef of rec.fields.values()) {
        const validate = VALIDATORS[ef.spec.datatype];
        if (!validate || !ef.value) continue;
        if (validate(ef.value) === false) {
          out.push(ctx.issue('warning', 'field', `${ef.spec.name} "${ef.value}" has an invalid check digit.`, [r.line]));
        }
      }
    }
    return out;
  },
};
