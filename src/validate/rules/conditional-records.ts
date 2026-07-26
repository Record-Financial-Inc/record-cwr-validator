// Layer 3: rules where one field's value obliges another record to exist, or obliges a second
// party to be present. Each was left open because the record type it depends on was not framed.
//
//   §4.2 t39  (TR) CWR Work Type "FM" requires an ORN carrying a Production Title.
//   §4.2 t53  (TR) Distribution Category "SER" requires an INS or an IND.
//   §4.2 t26  (TR) An "AQ" acquirer in a chain leaves the preceding original publisher at zero.
//   §5.9  f20 (TR) A zero-share composer on a MOD needs an arranger with a share.
//   §5.4  f28 (FR) An OPU with no usable publisher type is defaulted to "E" by the recipient.
//
// ORN, INS and IND became readable only once they had record widths; before that a file could
// break t39 or t53 and nothing here could tell.

import type { CwrIssue } from '../types';
import type { TxRule } from '../context';
import { extractRecord } from '../grammar/extract';
import { isPublisher, isWork, isWriter, RIGHTS, TOLERANCE } from '../shared';

const field = (raw: string, key: string): string =>
  extractRecord(raw)?.fields.get(key)?.value ?? '';

const blankish = (v: string): boolean => !v || /^0*$/.test(v);

/** Writer roles that contribute the modification a MOD version records. */
const MODIFIER_ROLES = new Set(['AR', 'TR', 'SA', 'SR', 'AD']);
/** Writer roles that author the underlying work rather than modify it. */
const ORIGINAL_ROLES = new Set(['C', 'CA', 'A']);
/** Publisher roles the specification defines; anything else is not usable as filed. */
const PUBLISHER_ROLES = new Set(['E', 'AQ', 'AM', 'PA', 'SE', 'ES', 'SD', 'ME', 'PAM']);

export const conditionalRecordsRule: TxRule = {
  id: 'CONDITIONAL_RECORDS',
  category: 'structure',
  layer: 3,
  phase: 13,
  run(ctx) {
    const out: CwrIssue[] = [];
    const work = ctx.readable.find(isWork);

    if (work) {
      // §4.2 t39: a film or television work must say where it came from.
      if (field(work.raw, 'work_type').trim().toUpperCase() === 'FM') {
        const orn = ctx.readable.find((r) => r.type === 'ORN');
        const productionTitle = orn ? field(orn.raw, 'production_title').trim() : '';
        if (!orn) {
          out.push(ctx.issue('error', 'structure', 'CWR Work Type is "FM", so the work must carry an ORN (Work Origin) record naming the production it came from (CWR19-1070 §4.2 p26 transaction rule 39, TR: transaction rejected).', [work.line]));
        } else if (!productionTitle) {
          out.push(ctx.issue('error', 'structure', 'CWR Work Type is "FM" and an ORN record is present, but its Production Title is empty. The rule requires the record AND the title (CWR19-1070 §4.2 p26 transaction rule 39, TR: transaction rejected).', [orn.line]));
        }
      }

      // §4.2 t53: a serious work must state its instrumentation.
      if (field(work.raw, 'musical_work_distribution_category').trim().toUpperCase() === 'SER') {
        const instrumented = ctx.readable.some((r) => r.type === 'INS' || r.type === 'IND');
        if (!instrumented) {
          out.push(ctx.issue('error', 'structure', 'Musical Work Distribution Category is "SER", so the work must carry an INS (Instrumentation Summary) or IND (Instrumentation Detail) record (CWR19-1070 §4.2 p27 transaction rule 53, TR: transaction rejected).', [work.line]));
        }
      }
    }

    // §4.2 t26: an acquirer takes the chain on, so the original publisher it acquired from
    // retains no ownership. A non-zero share on both would claim the same slice twice.
    const publishers = ctx.readable.filter(isPublisher);
    for (let i = 0; i < publishers.length; i += 1) {
      const p = publishers[i];
      if (field(p.raw, 'publisher_type').trim().toUpperCase() !== 'AQ') continue;
      // The preceding publisher in the same chain is the one acquired from.
      const prior = publishers.slice(0, i).reverse().find((q) => q.publisherSeq === p.publisherSeq);
      if (!prior) continue;
      const held = RIGHTS.filter((right) => (prior.ownership[right] ?? 0) > TOLERANCE);
      if (held.length > 0) {
        out.push(ctx.issue('error', 'overclaim', `"${prior.name || prior.ip}" is followed by an acquirer (publisher type "AQ") in chain ${p.publisherSeq}, yet still holds ${held.map((r) => r.toUpperCase()).join(', ')}. The original publisher's ownership passes to the acquirer, so it must be zero (CWR19-1070 §4.2 p25 transaction rule 26, TR: transaction rejected).`, [prior.line, p.line]));
      }
    }

    // §5.9 f20: a modified version credits someone for the modification. A composer of the
    // underlying work carrying no share, with no arranger who does, leaves the modification
    // unattributed and the work unregistrable as a MOD.
    if (work && field(work.raw, 'version_type').trim().toUpperCase() === 'MOD') {
      const writers = ctx.readable.filter(isWriter);
      const shareOf = (w: (typeof writers)[number]) =>
        RIGHTS.reduce((sum, right) => sum + (w.ownership[right] ?? 0), 0);
      const zeroShareOriginals = writers.filter(
        (w) => ORIGINAL_ROLES.has(field(w.raw, 'writer_designation').trim().toUpperCase()) && shareOf(w) <= TOLERANCE,
      );
      const hasPaidModifier = writers.some(
        (w) => MODIFIER_ROLES.has(field(w.raw, 'writer_designation').trim().toUpperCase()) && shareOf(w) > TOLERANCE,
      );
      if (zeroShareOriginals.length > 0 && !hasPaidModifier) {
        out.push(ctx.issue('error', 'link', `Version Type is "MOD" and ${zeroShareOriginals.length} writer${zeroShareOriginals.length === 1 ? ' is' : 's are'} credited as composer or author with no share, but no arranger, translator or adaptor holds one. A modified version must pay someone for the modification (CWR19-1070 §5.9 p48 field validation 20, TR: transaction rejected).`, zeroShareOriginals.map((w) => w.line).slice(0, 6)));
      }
    }

    // §5.4 f28: the recipient defaults an unusable publisher type on an OPU to "E". That is
    // silent downstream, so the submitter is told here rather than discovering it in a statement.
    for (const p of publishers) {
      if (p.type !== 'OPU') continue;
      const role = field(p.raw, 'publisher_type').trim().toUpperCase();
      if (blankish(role) || !PUBLISHER_ROLES.has(role)) {
        out.push(ctx.issue('warning', 'field', `"${p.name || p.ip}" is an OPU with ${role ? `an unrecognised publisher type "${role}"` : 'no publisher type'}. The recipient will file it as "E" (Original Publisher) rather than reject it, so state the role you mean (CWR19-1070 §5.4 p42 field validation 28, FR: the field is rejected and defaulted).`, [p.line]));
      }
    }

    return out;
  },
};
