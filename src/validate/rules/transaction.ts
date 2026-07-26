// Layer 3: transaction (per-work) rules. Issues auto-carry this work's txSeq (invariant I2).

import type { PublisherRecord } from '../../parse/parse-cwr';
import type { CwrIssue } from '../types';
import type { TxRule } from '../context';
import { RIGHTS, RIGHT_LABEL, TOLERANCE, isPublisher, isWriter, isPubTerr, isWriterTerr } from '../shared';
import { expandTerritory } from '../lookup/tis-hierarchy';
import { normaliseIpi } from '../../internal/ipi';

/**
 * Per right (PR/MR/SR), ownership across all parties (SPU/OPU/SWR/OWR) must total 100%, or 0% for
 * a right that is not used. CWR19-1070 §4.2 p26 edit 11 sets the tolerance at ±0.06%.
 *
 * That tolerance is the only boundary. An earlier version widened it to ±0.075% and demoted the
 * band between the two to a warning, on the grounds that the drift appeared in a a third-party converter file a
 * society had accepted. That file breaches this very rule, so it cannot license a looser reading:
 * a validator that relaxes the standard to match one accepted file is measuring the file, not the
 * standard. If a society chooses to accept more, that is their latitude to grant.
 */
export const ownershipTotalRule: TxRule = {
  id: 'OWNERSHIP_TOTAL',
  category: 'overclaim',
  layer: 3,
  phase: 0,
  run(ctx) {
    const out: CwrIssue[] = [];
    const parties = [...ctx.readable.filter(isPublisher), ...ctx.readable.filter(isWriter)];
    const lines = parties.map((r) => r.line);
    for (const right of RIGHTS) {
      const sum = parties.reduce((s, r) => s + r.ownership[right], 0);
      if (sum > 1 + TOLERANCE) {
        out.push(ctx.issue('error', 'overclaim', `${RIGHT_LABEL[right]} ownership totals ${(sum * 100).toFixed(2)}%: over 100%, so two parties claim the same slice (CWR19-1070 §4.2 p26 edit 11, tolerance ±0.06%).`, lines));
      } else if (sum > TOLERANCE && sum < 1 - TOLERANCE) {
        out.push(ctx.issue('error', 'overclaim', `${RIGHT_LABEL[right]} ownership totals ${(sum * 100).toFixed(2)}%: under 100%, so a co-writer or publisher is missing (CWR19-1070 §4.2 p26 edit 11, tolerance ±0.06%).`, lines));
      }
    }
    return out;
  },
};

/** Collection (SPT/OPT/SWT/OWT) must not exceed 100% for any right within any covered leaf territory. */
export const collectionTerritoryRule: TxRule = {
  id: 'COLLECTION_TERRITORY',
  category: 'territory',
  layer: 3,
  phase: 0,
  run(ctx) {
    const out: CwrIssue[] = [];
    const terr = [...ctx.readable.filter(isPubTerr), ...ctx.readable.filter(isWriterTerr)];
    const excludedByParty = new Map<string, Set<number>>();
    for (const t of terr) {
      if (t.indicator !== 'E') continue;
      const excluded = excludedByParty.get(t.ip) ?? new Set<number>();
      for (const leaf of expandTerritory(t.tis)) excluded.add(leaf);
      excludedByParty.set(t.ip, excluded);
    }

    const totals = new Map<string, { sum: number; lines: number[] }>();
    for (const t of terr) {
      if (t.indicator !== 'I') continue;
      const excluded = excludedByParty.get(t.ip);
      for (const leaf of expandTerritory(t.tis)) {
        if (excluded?.has(leaf)) continue;
        for (const right of RIGHTS) {
          const key = `${leaf}:${right}`;
          const entry = totals.get(key) ?? { sum: 0, lines: [] };
          entry.sum += t.collection[right];
          entry.lines.push(t.line);
          totals.set(key, entry);
        }
      }
    }

    for (const [key, entry] of totals) {
      if (entry.sum <= 1 + TOLERANCE) continue;
      const [tis, right] = key.split(':') as [string, (typeof RIGHTS)[number]];
      out.push(ctx.issue('error', 'territory', `${RIGHT_LABEL[right]} collection in territory ${tis} totals ${(entry.sum * 100).toFixed(1)}%: exceeds 100% (overlapping/over-claimed territory).`, entry.lines));
    }
    return out;
  },
};

/** The same IPI must not appear twice within ONE chain (publisher sequence #): the self-admin
 *  E+AM duplicate a society rejected. Distinct IPIs in a chain, or the same IPI across chains, are fine. */
export const duplicatePublisherRule: TxRule = {
  id: 'DUPLICATE_PUBLISHER',
  category: 'duplicate',
  layer: 3,
  phase: 0,
  run(ctx) {
    const out: CwrIssue[] = [];
    const seen = new Map<string, PublisherRecord>();
    for (const p of ctx.readable.filter(isPublisher)) {
      if (!p.ipi) continue; // blank IPIs can't be de-duplicated
      // Normalise the IPI (drop leading-zero padding) before keying: the SAME party can be filed as
      // "01234567846" and "1234567846", which are the same IP Name Number, so a raw-string key would
      // let a genuine E+AM self-admin duplicate slip past. The empty-after-normalise skip mirrors
      // ipiEquals(), so all-zero junk fills ("00000000000" vs "0") are not falsely flagged as one party.
      const norm = normaliseIpi(p.ipi);
      if (!norm) continue;
      const key = `${p.publisherSeq}|${norm}`;
      const prev = seen.get(key);
      if (prev) {
        out.push(ctx.issue('error', 'duplicate', `Duplicate publisher: "${p.name || p.ipi}" (IPI ${p.ipi}) appears twice in chain ${p.publisherSeq}.`, [prev.line, p.line]));
      } else {
        seen.set(key, p);
      }
    }
    return out;
  },
};

export const TX_RULES: TxRule[] = [ownershipTotalRule, collectionTerritoryRule, duplicatePublisherRule];
