// Layer 3: territory record consistency (CWR19-1070 §5.7 SPT/OPT p44-45, §5.12 SWT/OWT p50).
//
//   SPT rec 1 (TR, p44) An included territory must carry a collection share above zero.
//   SWT rec 1 (TR, p50) The same, for writer territories.
//   SWT rec 3 (FR, p50) An excluded territory must carry zero in every right.
//   SPT rec 5 (TR, p44) A TIS code may link to only one publisher for a given right.
//   SWT rec 2 (TR, p50) A TIS code may link to only one writer for a given right.
//
// ── On the zero-share included territory ────────────────────────────────────────────────────────
//
// The specification contradicts itself here, and both statements sit on page 44. The §5.7 prose:
//
//   "It is possible to have all zero shares on an SPT that includes one or more territories. Such a
//    record would be used to record a publisher's place in the chain of agreements."
//
// Record validation 1, unconditional, on the same page, at TR:
//
//   "If the Inclusion/Exclusion Indicator is 'I', at least one of PR Collection Share, MR Collection
//    Share, or SR Collection Share must be greater than zero."
//
// The prose describes a real and useful shape: an original publisher that owns but does not collect,
// because its administrator collects, still needs a territory record to hold its place in the chain.
// The validation rule forbids exactly that.
//
// This is reported as a WARNING rather than an error. Erroring would hard-block a file the
// specification's own prose sanctions; staying silent would hide a TR-severity rule that societies
// do implement, and at least one has rejected files for precisely this. The message states the
// conflict so the reader can decide, which is the only honest option when the source disagrees with
// itself.

import type { PublisherTerritoryRecord, WriterTerritoryRecord } from '../../parse/parse-cwr';
import type { CwrIssue } from '../types';
import type { TxRule } from '../context';
import { isPubTerr, isWriterTerr, RIGHTS, RIGHT_LABEL, TOLERANCE } from '../shared';

type Territory = PublisherTerritoryRecord | WriterTerritoryRecord;

const collected = (t: Territory): number =>
  RIGHTS.reduce((sum, right) => sum + (t.collection[right] ?? 0), 0);

export const territoryRecordRule: TxRule = {
  id: 'TERRITORY_RECORD',
  category: 'territory',
  layer: 3,
  phase: 9,
  run(ctx) {
    const out: CwrIssue[] = [];
    const pubTerrs = ctx.readable.filter(isPubTerr);
    const writerTerrs = ctx.readable.filter(isWriterTerr);

    for (const [terrs, kind, section] of [
      [pubTerrs, 'publisher', '§5.7 p44 record validation 1'],
      [writerTerrs, 'writer', '§5.12 p50 record validation 1'],
    ] as const) {
      for (const t of terrs) {
        const total = collected(t);

        if (t.indicator === 'I' && total <= TOLERANCE) {
          out.push(ctx.issue('warning', 'territory', `${t.type} for territory ${t.tis} includes the territory but collects nothing. CWR19-1070 ${section} (TR) requires an included territory to collect above zero, while the §5.7 prose on the same page permits an all-zero record "to record a ${kind}'s place in the chain of agreements". The specification contradicts itself; societies implement the validation rule, and files have been rejected for this.`, [t.line]));
        }

        // An exclusion carves a territory out, so it cannot also claim a share of it.
        if (t.indicator === 'E' && total > TOLERANCE) {
          out.push(ctx.issue('error', 'territory', `${t.type} for territory ${t.tis} excludes the territory yet collects ${(total * 100).toFixed(2)}% across the rights. An excluded territory must carry zero in every right (CWR19-1070 §5.12 p50 record validation 3).`, [t.line]));
        }
      }
    }

    // A territory may be claimed by only one party per right; two parties collecting the same right
    // in the same place is a double claim the per-territory total may still fail to reveal, since
    // one of them may be collecting zero.
    for (const [terrs, label, section] of [
      [pubTerrs, 'publishers', '§5.7 p44 record validation 5'],
      [writerTerrs, 'writers', '§5.12 p50 record validation 2'],
    ] as const) {
      for (const right of RIGHTS) {
        const byTis = new Map<number, Map<string, Territory>>();
        for (const t of terrs) {
          if (t.indicator !== 'I' || (t.collection[right] ?? 0) <= TOLERANCE) continue;
          const parties = byTis.get(t.tis) ?? new Map<string, Territory>();
          parties.set(t.ip, t);
          byTis.set(t.tis, parties);
        }
        for (const [tis, parties] of byTis) {
          if (parties.size < 2) continue;
          out.push(ctx.issue('error', 'territory', `Territory ${tis} is claimed for the ${RIGHT_LABEL[right]} right by ${parties.size} different ${label}. A territory links to one party per right (CWR19-1070 ${section}, TR: transaction rejected).`, [...parties.values()].map((t) => t.line).slice(0, 6)));
        }
      }
    }

    return out;
  },
};
