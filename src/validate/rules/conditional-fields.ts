// Layer 3 — conditional cross-field rules on the work record (CWR19-1070 §4.2).
//
// Each of these is dormant until another field takes a particular value, which is why a writer that
// only ever emits original, non-composite works never trips one. That makes them exactly the rules
// that matter when validating a file somebody else produced.
//
//   Field 7  (TR, p28) "SER" distribution category requires a Duration greater than zero.
//   Field 14 (TR, p28) Version Type "MOD" requires Music Arrangement.
//   Field 15 (TR, p28) Version Type "MOD" requires Lyric Adaptation.
//   Field 18 (TR, p28) Composite Type requires Composite Component Count.
//   Field 19 (TR, p28) Composite Component Count requires Composite Type.
//   Field 20 (TR, p28) Composite Component Count must be numeric and greater than 1.
//   Trans 10 (TR, p25) A "MOD" work must credit at least one arranger, adapter, sub-arranger,
//                      sub-author or translator.
//   Trans 23 (TR, p25) An "ORI" work must credit none of them.
//
// Rules 10 and 23 are complementary: a modified version has someone who modified it, and an
// original has nobody who did. Whether the codes themselves are valid is LOOKUP_CODE's concern;
// these rules are only about presence, absence and consistency.

import type { CwrIssue } from '../types';
import type { TxRule } from '../context';
import { extractRecord } from '../grammar/extract';
import { isWork, isWriter } from '../shared';

/** Writer roles that denote modifying an existing work rather than authoring a new one. */
const MODIFIER_CODES = new Set(['AR', 'AD', 'SR', 'SA', 'TR']);
const MODIFIER_LABEL = 'arranger, adapter, sub-arranger, sub-author or translator';

const field = (raw: string, key: string): string =>
  extractRecord(raw)?.fields.get(key)?.value ?? '';

export const conditionalFieldRule: TxRule = {
  id: 'CONDITIONAL_FIELDS',
  category: 'mandatory',
  layer: 3,
  phase: 8,
  run(ctx) {
    const work = ctx.readable.find(isWork);
    if (!work) return [];

    const out: CwrIssue[] = [];
    const at = (key: string) => field(work.raw, key);
    const versionType = at('version_type');
    const line = [work.line];

    // Field 7 — a serious work is registered with its duration, because duration drives its
    // distribution.
    if (at('musical_work_distribution_category') === 'SER') {
      const duration = at('duration');
      if (!duration || /^0*$/.test(duration)) {
        out.push(ctx.issue('error', 'mandatory', `Distribution category is "SER" but Duration is ${duration ? `"${duration}"` : 'absent'}. A serious work must carry a duration greater than zero (CWR19-1070 §4.2 p28 field validation 7, TR — transaction rejected).`, line));
      }
    }

    // Fields 14 and 15 — a modified version records how it was modified.
    if (versionType === 'MOD') {
      if (!at('music_arrangement')) {
        out.push(ctx.issue('error', 'mandatory', `Version Type is "MOD" but Music Arrangement is absent. A modified version must record how the music was arranged (CWR19-1070 §4.2 p28 field validation 14, TR — transaction rejected).`, line));
      }
      if (!at('lyric_adaptation')) {
        out.push(ctx.issue('error', 'mandatory', `Version Type is "MOD" but Lyric Adaptation is absent. A modified version must record how the lyric was adapted (CWR19-1070 §4.2 p28 field validation 15, TR — transaction rejected).`, line));
      }
    }

    // Fields 18, 19 and 20 — a composite is described by both fields or neither.
    const compositeType = at('composite_type');
    const componentCount = at('composite_component_count');
    if (compositeType && !componentCount) {
      out.push(ctx.issue('error', 'mandatory', `Composite Type is "${compositeType}" but Composite Component Count is absent. A composite must say how many components it has (CWR19-1070 §4.2 p28 field validation 18, TR — transaction rejected).`, line));
    }
    if (componentCount && !/^0*$/.test(componentCount) && !compositeType) {
      out.push(ctx.issue('error', 'mandatory', `Composite Component Count is "${componentCount}" but Composite Type is absent (CWR19-1070 §4.2 p28 field validation 19, TR — transaction rejected).`, line));
    }
    if (componentCount && !/^0*$/.test(componentCount)) {
      const count = Number(componentCount);
      if (!Number.isFinite(count) || count <= 1) {
        out.push(ctx.issue('error', 'mandatory', `Composite Component Count is "${componentCount}". A composite is made of more than one component, so the count must be greater than 1 (CWR19-1070 §4.2 p28 field validation 20, TR — transaction rejected).`, line));
      }
    }

    // Transaction 10 and 23 — a modified version has someone who modified it; an original does not.
    const writers = ctx.readable.filter(isWriter);
    const modifiers = writers.filter((w) => MODIFIER_CODES.has((w.designation ?? '').trim()));
    if (versionType === 'MOD' && writers.length > 0 && modifiers.length === 0) {
      out.push(ctx.issue('error', 'mandatory', `Version Type is "MOD" but no writer is credited as ${MODIFIER_LABEL}. A modified version has someone who modified it (CWR19-1070 §4.2 p25 transaction rule 10, TR — transaction rejected).`, writers.map((w) => w.line).slice(0, 6)));
    }
    if (versionType === 'ORI' && modifiers.length > 0) {
      out.push(ctx.issue('error', 'mandatory', `Version Type is "ORI" but ${modifiers.length} writer${modifiers.length === 1 ? ' is' : 's are'} credited as ${MODIFIER_LABEL}. An original work has no one who modified it; if it was modified, the version type is "MOD" (CWR19-1070 §4.2 p25 transaction rule 23, TR — transaction rejected).`, modifiers.map((w) => w.line).slice(0, 6)));
    }

    return out;
  },
};
