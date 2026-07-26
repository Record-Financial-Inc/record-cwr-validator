// Layer 3 — publisher chain-of-title consistency.
//
// A publisher's role determines what it may hold. CWR19-1070 §5.4:
//
//   Record 2  (TR, p39) The first SPU in a chain must be an Original Publisher or Income
//                       Participant (Publisher Type "E" or "PA").
//   Record 3  (TR, p39) If Publisher Type is "SE", "AM", "PA" or "ES", ownership shares must be zero.
//   Record 8  (TR, p40) An Acquirer must hold more than zero in at least one right.
//   Field 19  (TR, p41) All ownership shares must be zero if Publisher Type is not "E" or "AQ";
//                       only Original Publishers and Acquirers can own.
//   Field 32  (TR, p42) An "AQ" record must follow an SPU with role "E".
//
// Record 3 and Field 19 are the same requirement stated twice, once by enumeration and once as a
// rule. Field 19 is the general form, so it is what the check implements, and its message cites
// both.
//
// This matters beyond tidiness: an administrator that owns shares while also collecting them is
// double-counted against the work's 100%, and the ownership total rule cannot tell the difference
// between that and a legitimate original publisher.

import type { PublisherRecord } from '../../parse/parse-cwr';
import type { CwrIssue } from '../types';
import type { TxRule } from '../context';
import { isPublisher, RIGHTS, TOLERANCE } from '../shared';

/** Roles permitted to hold ownership shares (§5.4 p41 field validation 19). */
const OWNING_ROLES = new Set(['E', 'AQ']);
/** Roles permitted to head a chain of title (§5.4 p39 record validation 2). */
const CHAIN_HEAD_ROLES = new Set(['E', 'PA']);

const totalOwned = (p: PublisherRecord): number =>
  RIGHTS.reduce((sum, right) => sum + (p.ownership[right] ?? 0), 0);

const label = (p: PublisherRecord): string => p.name || p.ipi || p.ip;

export const publisherChainRule: TxRule = {
  id: 'PUBLISHER_CHAIN_ROLE',
  category: 'duplicate',
  layer: 3,
  phase: 6,
  run(ctx) {
    const out: CwrIssue[] = [];
    const publishers = ctx.readable.filter(isPublisher);
    if (publishers.length === 0) return out;

    // Chains are keyed by publisher sequence #, in the order their records appear.
    const chains = new Map<number, PublisherRecord[]>();
    for (const p of publishers) {
      const chain = chains.get(p.publisherSeq);
      if (chain) chain.push(p);
      else chains.set(p.publisherSeq, [p]);
    }

    for (const [seq, chain] of chains) {
      const head = chain[0];
      // A blank role is a missing mandatory field (§5.4 FV5), which MANDATORY_FIELD owns.
      if (head.role && !CHAIN_HEAD_ROLES.has(head.role)) {
        out.push(ctx.issue('error', 'duplicate', `Chain ${seq} is headed by "${label(head)}" with publisher type "${head.role}". A chain must begin with an Original Publisher ("E") or Income Participant ("PA") (CWR19-1070 §5.4 p39 record validation 2, TR — transaction rejected).`, [head.line]));
      }

      let seenOriginal = false;
      for (const p of chain) {
        if (!p.role) continue;
        if (p.role === 'E') seenOriginal = true;

        const owned = totalOwned(p);

        // Field 19 / Record 3 — only an Original Publisher or Acquirer may own.
        if (!OWNING_ROLES.has(p.role) && owned > TOLERANCE) {
          out.push(ctx.issue('error', 'duplicate', `"${label(p)}" has publisher type "${p.role}" but holds ownership shares totalling ${(owned * 100).toFixed(2)}%. Only an Original Publisher ("E") or Acquirer ("AQ") may own; an administrator or sub-publisher collects without owning (CWR19-1070 §5.4 p41 field validation 19 and p39 record validation 3, TR — transaction rejected).`, [p.line]));
        }

        // Record 8 — an Acquirer that acquired nothing is not an acquirer.
        if (p.role === 'AQ' && owned <= TOLERANCE) {
          out.push(ctx.issue('error', 'duplicate', `"${label(p)}" is an Acquirer ("AQ") but holds no ownership in any right. An Acquirer must hold more than zero in at least one of PR, MR or SR (CWR19-1070 §5.4 p40 record validation 8, TR — transaction rejected).`, [p.line]));
        }

        // Field 32 — an Acquirer acquires from an Original Publisher, so one must precede it.
        if (p.role === 'AQ' && !seenOriginal) {
          out.push(ctx.issue('error', 'duplicate', `"${label(p)}" has publisher type "AQ" but no Original Publisher ("E") precedes it in chain ${seq} (CWR19-1070 §5.4 p42 field validation 32, TR — transaction rejected).`, [p.line]));
        }
      }
    }

    return out;
  },
};
