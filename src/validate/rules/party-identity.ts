// Layer 4 — interested-party identity.
//
// CWR19-1070 §5.4 p40, Field Level Validation 3 (TR):
//   "Submitters must ensure that the Interested Party # is unique within their system for both
//    current and past controlled parties."
//
// One party means one Interested Party #. The check is a bijection between the IP # and the party
// it identifies (keyed on IPI Name Number), run across the whole file rather than per transaction:
// the spec scopes uniqueness to the submitter's system, and a file is the largest scope we can see.
//
// Two rules nearby cover neither direction of this:
//   - ip-uniqueness (IP_UNIQUE_IN_TX) catches two DIFFERENT parties sharing one IP # in a work.
//   - transaction (DUPLICATE_PUBLISHER) catches one IPI repeated within a single publisher chain.
// A party emitted under two IP #s in two chains satisfies both and still breaks §5.4 FV3. That is
// the shape a real submission carried: IPI 01234567846 as IP # 000000001 and 000000002 in one work.
//
// The spec does NOT forbid a party appearing in more than one chain — §5.4 FV1 simply numbers
// chains 1, 2, 3… What it forbids is that party carrying two identities.

import type { PublisherRecord, WriterRecord } from '../../parse/parse-cwr';
import { normaliseIpi } from '../../internal/ipi';
import type { CwrIssue } from '../types';
import type { FileRule } from '../context';
import { isPublisher, isWriter } from '../shared';

type Party = PublisherRecord | WriterRecord;

/** Prefer a human-readable label for the message; fall back to the identifier. */
const label = (p: Party): string =>
  ('name' in p ? p.name : [p.firstName, p.lastName].filter(Boolean).join(' ')) || p.ipi || p.ip;

export const partyIdentityRule: FileRule = {
  id: 'PARTY_IP_BIJECTION',
  category: 'duplicate',
  layer: 4,
  phase: 2,
  run(ctx) {
    const parties = ctx.readable.filter((r): r is Party => isPublisher(r) || isWriter(r));

    // IPI → the distinct IP #s it was filed under, and IP # → the distinct IPIs filed under it.
    const ipisToIps = new Map<string, Map<string, Party[]>>();
    const ipsToIpis = new Map<string, Map<string, Party[]>>();

    for (const p of parties) {
      const ipi = normaliseIpi(p.ipi);
      // A blank or all-zero IPI is a missing identifier, not a second identity; the mandatory-field
      // and check-digit rules own that. Likewise a party with no IP # at all.
      if (!ipi || !p.ip.trim()) continue;
      const byIp = ipisToIps.get(ipi) ?? new Map<string, Party[]>();
      byIp.set(p.ip, [...(byIp.get(p.ip) ?? []), p]);
      ipisToIps.set(ipi, byIp);

      const byIpi = ipsToIpis.get(p.ip) ?? new Map<string, Party[]>();
      byIpi.set(ipi, [...(byIpi.get(ipi) ?? []), p]);
      ipsToIpis.set(p.ip, byIpi);
    }

    const out: CwrIssue[] = [];

    for (const [ipi, byIp] of ipisToIps) {
      if (byIp.size < 2) continue;
      const all = [...byIp.values()].flat();
      const ips = [...byIp.keys()];
      out.push(ctx.issue(
        'error',
        'duplicate',
        `"${label(all[0])}" (IPI ${ipi}) is filed under ${byIp.size} different Interested Party numbers (${ips.join(', ')}). One party must carry one Interested Party # (CWR19-1070 §5.4 p40 field validation 3, TR — transaction rejected).`,
        all.map((p) => p.line).slice(0, 8),
      ));
    }

    for (const [ip, byIpi] of ipsToIpis) {
      if (byIpi.size < 2) continue;
      const all = [...byIpi.values()].flat();
      out.push(ctx.issue(
        'error',
        'duplicate',
        `Interested Party # ${ip} identifies ${byIpi.size} different parties (IPI ${[...byIpi.keys()].join(', ')}). An Interested Party # must identify exactly one party (CWR19-1070 §5.4 p40 field validation 3, TR — transaction rejected).`,
        all.map((p) => p.line).slice(0, 8),
      ));
    }

    return out;
  },
};
