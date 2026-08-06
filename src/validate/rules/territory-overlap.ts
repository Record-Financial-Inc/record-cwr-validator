// Layer 3: territory overlap. A party must not INCLUDE two territories whose coverage intersects: the
// shared locations are then claimed twice. P5 already catches the same TIS code included and excluded;
// this catches *different* codes that overlap by containment or partial membership: World + USA, EU +
// France (member), EU + EEA (overlapping groups).
//
// Driven off the full CISAC TIS hierarchy (lookup/tis-hierarchy.ts). Severity `warning`: our generator
// only ever emits a single World territory per party, so a generated file never trips it, and the
// hierarchy is a ~2019 snapshot: a stale membership must not hard-reject a valid claim.
// Governing rule: CWR19-1070 §5.7 p44 record validation 5 (TR).

import type { CwrIssue } from '../types';
import type { TxRule } from '../context';
import { isPubTerr, isWriterTerr } from '../shared';
import { tisOverlaps } from '../lookup/tis-hierarchy';

export const territoryOverlapRule: TxRule = {
  id: 'TERRITORY_OVERLAP',
  category: 'territory',
  layer: 3,
  phase: 12,
  run(ctx) {
    const terr = [...ctx.readable.filter(isPubTerr), ...ctx.readable.filter(isWriterTerr)];

    // interested party → list of its INCLUDED territories (code + line)
    const includedByIp = new Map<string, { tis: number; line: number }[]>();
    for (const t of terr) {
      if (t.indicator !== 'I') continue; // an excluded territory is a carve-out, not an overlap
      const list = includedByIp.get(t.ip);
      if (list) list.push({ tis: t.tis, line: t.line });
      else includedByIp.set(t.ip, [{ tis: t.tis, line: t.line }]);
    }

    const out: CwrIssue[] = [];
    for (const list of includedByIp.values()) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          if (tisOverlaps(list[i].tis, list[j].tis)) {
            out.push(ctx.issue('warning', 'territory', `Included territories ${list[i].tis} and ${list[j].tis} overlap: the same locations are claimed twice for one party.`, [list[i].line, list[j].line], 'TR'));
          }
        }
      }
    }
    return out;
  },
};
