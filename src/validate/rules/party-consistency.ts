// Layer 3: party and record consistency rules that had no implementation.
//
// Each is small and mechanical, and each was left open only because the work moved on:
//
//   SPU FV7   (TR) An SPU must leave Publisher Unknown blank; it names a known publisher.
//   SPU FV9   (FR) An OPU flagged publisher-unknown must carry no publisher name.
//   SPU FV27  (FR) An OPU's Special Agreements Indicator may only be "L" or blank.
//   SPU FV40  (TR) The collecting publisher must carry an IPI Name Number.
//   SWR FV4   (TR) An SWR must leave Writer Unknown blank; it names a known writer.
//   SWR FV6   (FR) An OWR flagged writer-unknown must carry no last name.
//   SPT FV13  (RR) SPT sequence numbers start at 1 per publisher and increment by 1.
//   SWT FV10  (RR) SWT sequence numbers start at 1 per writer and increment by 1.
//   REC FV1   (RR) A recording record must carry at least one of its optional fields.
//   §4.2 t16  (TR) A non-controlled publisher may not appear in a controlled chain.
//   §4.2 t25  (TR) Each SPU chain must hold more than zero in at least one right.
//
// Severity follows the specification's grading: FR reports as a warning because the field is
// dropped and the registration proceeds; TR and RR report as errors because a transaction or a
// record is lost.

import type { PublisherRecord } from '../../parse/parse-cwr';
import { normaliseIpi } from '../../internal/ipi';
import type { CwrIssue } from '../types';
import type { TxRule } from '../context';
import { extractRecord } from '../grammar/extract';
import { isPublisher, isPubTerr, isWriterTerr, RIGHTS, TOLERANCE } from '../shared';

const field = (raw: string, key: string): string =>
  extractRecord(raw)?.fields.get(key)?.value ?? '';

/** The optional fields a REC record may carry; at least one must be present (§5.21 FV1). */
const REC_OPTIONAL = [
  'first_release_date', 'first_release_duration', 'first_album_title', 'first_album_label',
  'first_release_catalog_n', 'ean13', 'isrc', 'recording_format', 'recording_technique',
  'media_type', 'recording_title', 'version_title',
];

const blankish = (v: string): boolean => !v || /^0*$/.test(v);

export const partyConsistencyRule: TxRule = {
  id: 'PARTY_CONSISTENCY',
  category: 'field',
  layer: 3,
  phase: 12,
  run(ctx) {
    const out: CwrIssue[] = [];

    for (const r of ctx.readable) {
      // ── Publishers ──────────────────────────────────────────────────────────────────────────
      if (r.type === 'SPU' || r.type === 'OPU') {
        const unknown = field(r.raw, 'publisher_unknown').toUpperCase();
        const name = field(r.raw, 'publisher_name');

        if (r.type === 'SPU' && unknown) {
          out.push(ctx.issue('error', 'field', `An SPU names a publisher the submitter controls, so Publisher Unknown must be blank; this one is "${unknown}" (CWR19-1070 §5.4 p40 field validation 7, TR: transaction rejected).`, [r.line]));
        }
        if (r.type === 'OPU' && unknown === 'Y' && name) {
          out.push(ctx.issue('warning', 'field', `This OPU is flagged publisher-unknown yet names "${name}". A record cannot both decline to identify a publisher and identify one (CWR19-1070 §5.4 p41 field validation 9, FR: the field is rejected).`, [r.line]));
        }
        if (r.type === 'OPU') {
          const special = field(r.raw, 'special_agreements').toUpperCase();
          if (special && special !== 'L') {
            out.push(ctx.issue('warning', 'field', `Special Agreements Indicator is "${special}" on an OPU, where only "L" or blank is permitted (CWR19-1070 §5.4 p41 field validation 27, FR: the field is rejected).`, [r.line]));
          }
        }
        continue;
      }

      // ── Writers ─────────────────────────────────────────────────────────────────────────────
      if (r.type === 'SWR' || r.type === 'OWR') {
        const unknown = field(r.raw, 'writer_unknown').toUpperCase();
        const last = field(r.raw, 'writer_last_name');
        if (r.type === 'SWR' && unknown) {
          out.push(ctx.issue('error', 'field', `An SWR names a writer the submitter controls, so Writer Unknown must be blank; this one is "${unknown}" (CWR19-1070 §5.9 p47 field validation 4, TR: transaction rejected).`, [r.line]));
        }
        if (r.type === 'OWR' && unknown === 'Y' && last) {
          out.push(ctx.issue('warning', 'field', `This OWR is flagged writer-unknown yet names "${last}" (CWR19-1070 §5.9 p47 field validation 6, FR: the field is rejected).`, [r.line]));
        }
        continue;
      }

      // ── Recordings ──────────────────────────────────────────────────────────────────────────
      if (r.type === 'REC') {
        const carries = REC_OPTIONAL.some((k) => !blankish(field(r.raw, k)));
        if (!carries) {
          out.push(ctx.issue('error', 'field', `This recording record carries none of its optional fields, so it states nothing. At least one must be entered (CWR19-1070 §5.21 p60 field validation 1, RR: record rejected).`, [r.line]));
        }
      }
    }

    // ── Territory sequence numbering, per owning party ─────────────────────────────────────────
    // §5.7 FV13 and §5.12 FV10: the first territory record after its party is sequence 1, and each
    // subsequent one increments. Numbering restarts for each party, so it is tracked per party.
    for (const [terrs, section, sev] of [
      [ctx.readable.filter(isPubTerr), '§5.7 p45 field validation 13', 'error'],
      [ctx.readable.filter(isWriterTerr), '§5.12 p50 field validation 10', 'error'],
    ] as const) {
      const nextFor = new Map<string, number>();
      for (const t of terrs) {
        const expected = nextFor.get(t.ip) ?? 1;
        const raw = field(t.raw, 'sequence_n');
        if (raw && !blankish(raw)) {
          const seq = Number(raw);
          if (!Number.isFinite(seq) || seq !== expected) {
            out.push(ctx.issue(sev, 'sequence', `${t.type} sequence number is ${raw}, but territory records for one party start at 1 and increment, so ${expected} was expected (CWR19-1070 ${section}, RR: record rejected).`, [t.line]));
          }
        }
        nextFor.set(t.ip, expected + 1);
      }
    }

    // ── Chain integrity ───────────────────────────────────────────────────────────────────────
    const publishers = ctx.readable.filter(isPublisher);
    const chains = new Map<number, PublisherRecord[]>();
    for (const p of publishers) {
      const c = chains.get(p.publisherSeq);
      if (c) c.push(p);
      else chains.set(p.publisherSeq, [p]);
    }
    for (const [seq, chain] of chains) {
      // §4.2 t16: a chain a submitter controls is controlled throughout.
      const controlled = chain.some((p) => p.type === 'SPU');
      const nonControlled = chain.filter((p) => p.type === 'OPU');
      if (controlled && nonControlled.length) {
        out.push(ctx.issue('error', 'duplicate', `Chain ${seq} begins with a controlled publisher yet contains ${nonControlled.length} non-controlled (OPU) record${nonControlled.length === 1 ? '' : 's'}. A controlled chain of title is controlled throughout (CWR19-1070 §4.2 p25 transaction rule 16, TR: transaction rejected).`, nonControlled.map((p) => p.line).slice(0, 5)));
      }
      // §4.2 t25: a controlled chain that owns nothing in any right is not a chain of title.
      const spus = chain.filter((p) => p.type === 'SPU');
      if (spus.length) {
        const held = RIGHTS.some((right) => spus.reduce((s, p) => s + (p.ownership[right] ?? 0), 0) > TOLERANCE);
        if (!held) {
          out.push(ctx.issue('error', 'overclaim', `Chain ${seq} holds nothing in any right. A controlled publisher chain must own more than zero of at least one of PR, MR or SR (CWR19-1070 §4.2 p25 transaction rule 25, TR: transaction rejected).`, spus.map((p) => p.line).slice(0, 5)));
        }
      }
    }

    // §5.4 FV40: the publisher that collects must be identifiable by IPI.
    const collectingIps = new Set(
      ctx.readable.filter(isPubTerr)
        .filter((t) => RIGHTS.some((r) => (t.collection[r] ?? 0) > TOLERANCE))
        .map((t) => t.ip),
    );
    for (const p of publishers) {
      if (p.type !== 'SPU' || !collectingIps.has(p.ip)) continue;
      if (!normaliseIpi(field(p.raw, 'ipi_name_n'))) {
        out.push(ctx.issue('error', 'field', `"${p.name || p.ip}" collects in at least one territory but carries no IPI Name Number. The collecting publisher must be identifiable (CWR19-1070 §5.4 p42 field validation 40, TR: transaction rejected).`, [p.line]));
      }
    }

    return out;
  },
};
