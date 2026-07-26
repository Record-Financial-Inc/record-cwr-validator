// Layer 3 — territory include/exclude logic. "Overlapping TIS records" is a common rejection
// reason. The full TIS hierarchy (is France inside World, is the UK inside Europe…) isn't
// loaded yet, so this catches the unambiguous, hierarchy-free case: a single interested party that
// both INCLUDES and EXCLUDES the same TIS code — a contradictory territory scope no hierarchy can
// reconcile. The generator only ever emits 'I' territories, so this never fires on our own output.

import type { CwrIssue } from '../types';
import type { TxRule } from '../context';
import { isPubTerr, isWriterTerr } from '../shared';

export const territoryIeContradictionRule: TxRule = {
  id: 'TERRITORY_IE_CONTRADICTION',
  category: 'territory',
  layer: 3,
  phase: 5,
  run(ctx) {
    const terr = [...ctx.readable.filter(isPubTerr), ...ctx.readable.filter(isWriterTerr)];

    // interested party → TIS code → indicators seen for it (+ the lines that carry them)
    const byIp = new Map<string, Map<number, { indicators: Set<string>; lines: number[] }>>();
    for (const t of terr) {
      if (t.indicator !== 'I' && t.indicator !== 'E') continue;
      let byTis = byIp.get(t.ip);
      if (!byTis) byIp.set(t.ip, (byTis = new Map()));
      let entry = byTis.get(t.tis);
      if (!entry) byTis.set(t.tis, (entry = { indicators: new Set(), lines: [] }));
      entry.indicators.add(t.indicator);
      entry.lines.push(t.line);
    }

    const out: CwrIssue[] = [];
    for (const byTis of byIp.values()) {
      for (const [tis, entry] of byTis) {
        if (entry.indicators.has('I') && entry.indicators.has('E')) {
          out.push(ctx.issue('error', 'territory', `Territory ${tis} is both included and excluded for the same party — contradictory/overlapping territory scope.`, entry.lines));
        }
      }
    }
    return out;
  },
};
