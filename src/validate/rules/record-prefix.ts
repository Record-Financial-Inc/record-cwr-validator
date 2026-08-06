// Layer 4: the record prefix (CWR19-1070 §2.1 Properties of EDI Components, p8-9).
//
// Every record opens with the same 19 bytes: record type (3), transaction sequence (8), record
// sequence (8). The validations on those bytes are the most severe in the specification, because a
// file whose records do not agree about which transaction they belong to cannot be read at all:
//
//   FV1 (ER) Record Type must be a valid transaction or detail record type.
//   FV4 (TR) A detail record's Transaction Sequence # must equal its transaction header's.
//   FV8 (ER) Detail records not carrying their header's Transaction Sequence # are out of sequence,
//            and the entire file is rejected.
//   FV9 (ER) Record length must match the length specified for the record type.
//
// FV2, 3, 5, 6 and 7 are the sequence numbering rules, covered by TX_SEQUENCE and RECORD_SEQUENCE.
//
// ── On record length ────────────────────────────────────────────────────────────────────────────
//
// FV9 is unambiguous and ER: the length must match. The parser is nonetheless tolerant of records
// that stop short of their specified width, because real files right-trim optional trailing fields
// and societies do ingest them. That tolerance is a reading decision, not a licence: the rule says
// what it says.
//
// So a short record is reported, at warning severity, naming the rule and its ER standing. Erroring
// would block files that demonstrably work in practice; silence would repeat the mistake that let
// records of 115 bytes against a specified 167 ship unremarked for months.

import { CWR_RECORD_LENGTHS } from '../../spec/record-lengths';
import type { CwrIssue } from '../types';
import type { FileRule } from '../context';
import { isWork } from '../shared';

/** The record's own transaction sequence, read from its prefix rather than inherited. */
const ownTxSeq = (raw: string): number => {
  const n = parseInt(raw.slice(3, 11), 10);
  return Number.isNaN(n) ? NaN : n;
};

/** Record types that open a transaction; everything else in a transaction is a detail record. */
const TRANSACTION_HEADS = new Set(['NWR', 'REV', 'ISW', 'EXC']);
const ENVELOPE = new Set(['HDR', 'GRH', 'GRT', 'TRL']);

export const recordPrefixRule: FileRule = {
  id: 'RECORD_PREFIX',
  category: 'sequence',
  layer: 4,
  phase: 5,
  run(ctx) {
    const out: CwrIssue[] = [];

    // FV1: a record type the specification does not define.
    for (const r of ctx.records) {
      if (CWR_RECORD_LENGTHS[r.type] === undefined && !/^[A-Z]{3}$/.test(r.type)) {
        out.push(ctx.issue('error', 'sequence', `"${r.type}" is not a valid record type (CWR19-1070 §2.1 p8 field validation 1, ER: entire file rejected).`, [r.line]));
      }
    }

    // FV4 and FV8: a detail record belongs to the transaction whose number it carries. The parser
    // attributes records to the preceding header, so a record whose own prefix disagrees would
    // otherwise be silently reassigned rather than reported.
    let headerTx: number | null = null;
    let headerLine = 0;
    for (const r of ctx.records) {
      if (ENVELOPE.has(r.type)) {
        headerTx = null;
        continue;
      }
      const own = ownTxSeq(r.raw);
      if (Number.isNaN(own)) continue;
      if (isWork(r)) {
        headerTx = own;
        headerLine = r.line;
        continue;
      }
      if (!TRANSACTION_HEADS.has(r.type) && headerTx !== null && own !== headerTx) {
        out.push(ctx.issue('error', 'sequence', `${r.type} carries transaction sequence ${own} but follows a transaction header numbered ${headerTx}. A detail record belongs to the transaction whose number it carries (CWR19-1070 §2.1 p9 field validations 4 and 8, ER: entire file rejected).`, [headerLine, r.line]));
      }
    }

    // FV9: record length, grouped by record TYPE with a range rather than by exact width.
    //
    // A right-trimmed file trims to wherever its last populated field ends, so its records come in
    // many lengths: one real file has PER records at twenty distinct widths. Keying the group on the
    // width would turn a single defect into twenty rows, which is the noise problem this engine
    // spent the night removing. One row per type, with the range, describes it fully.
    const short = new Map<string, { expected: number; count: number; min: number; max: number; lines: number[] }>();
    for (const r of ctx.records) {
      const expected = CWR_RECORD_LENGTHS[r.type];
      if (expected === undefined || r.raw.length >= expected) continue;
      const g = short.get(r.type);
      if (g) {
        g.count += 1;
        g.min = Math.min(g.min, r.raw.length);
        g.max = Math.max(g.max, r.raw.length);
        if (g.lines.length < 5) g.lines.push(r.line);
      } else {
        short.set(r.type, { expected, count: 1, min: r.raw.length, max: r.raw.length, lines: [r.line] });
      }
    }
    for (const [type, g] of short) {
      const width = g.min === g.max ? `${g.min} characters` : `between ${g.min} and ${g.max} characters`;
      out.push(ctx.issue('warning', 'structure', `${type}: ${g.count} record${g.count === 1 ? ' stops' : 's stop'} short at ${width}, against a specified ${g.expected}. CWR19-1070 §2.1 p9 field validation 9 requires the length to match, at ER (entire file rejected); trailing optional fields are widely right-trimmed in practice and generally ingested, so this is reported rather than blocked.`, g.lines, 'RR'));
    }

    return out;
  },
};
