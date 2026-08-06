// Layer 4: GRT/TRL count verification. a society rejects a file whose trailers disagree with the
// records they frame. The parser keeps GRT/TRL as type-only records, so we read the count fields
// straight off the raw line (offsets mirror buildGrt/buildTrl: type(3) + n(5) + n(8) + n(8)).
// Governing rule: CWR19-1070 §3.7 p16 field validations 2-3 and §3.8 p17 field validations 1-3 (GR and ER).

import type { CwrIssue } from '../types';
import type { FileRule } from '../context';

/**
 * A count read from a trailer, or null when the field is blank.
 *
 * Blank is NOT zero. Mapping it to zero made this rule state "TRL record count 0 does not match the
 * actual 11 records", which asserts a count the trailer does not carry, and reported a second
 * defect for a field that is simply absent. ENVELOPE_FIELD owns the absence; this rule compares
 * counts that are there.
 */
const numAt = (raw: string, a: number, b: number): number | null => {
  const slice = raw.slice(a, b).trim();
  if (slice === '') return null;
  const n = parseInt(slice, 10);
  return Number.isNaN(n) ? 0 : n;
};

export const countsRule: FileRule = {
  id: 'TRAILER_COUNTS',
  category: 'count',
  layer: 4,
  phase: 1,
  run(ctx) {
    // Broken framing makes counts meaningless: the framing rule already flags it.
    if (ctx.parsed.malformedLines.length) return [];

    const out: CwrIssue[] = [];
    const recs = ctx.records;
    const grhCount = recs.filter((r) => r.type === 'GRH').length;
    const grt = recs.find((r) => r.type === 'GRT');
    const trl = recs.find((r) => r.type === 'TRL');
    const txCount = ctx.parsed.transactionCount;

    if (trl) {
      const groupCount = numAt(trl.raw, 3, 8);
      const trlTx = numAt(trl.raw, 8, 16);
      const trlRec = numAt(trl.raw, 16, 24);
      if (trlRec !== null && trlRec !== recs.length) out.push(ctx.issue('error', 'count', `TRL record count ${trlRec} does not match the actual ${recs.length} records in the file.`, [trl.line]));
      if (trlTx !== null && trlTx !== txCount) out.push(ctx.issue('error', 'count', `TRL transaction count ${trlTx} does not match the actual ${txCount} transactions.`, [trl.line]));
      if (groupCount !== null && groupCount !== grhCount) out.push(ctx.issue('error', 'count', `TRL group count ${groupCount} does not match the actual ${grhCount} group(s).`, [trl.line]));
    }

    // GRT counts the records within its group (GRH … GRT inclusive). Only check the single-group
    // case our generator produces; multi-group files skip (framing/structure covers the rest).
    if (grt && grhCount === 1) {
      const grhIdx = recs.findIndex((r) => r.type === 'GRH');
      const grtIdx = recs.findIndex((r) => r.type === 'GRT');
      const groupRecords = grtIdx - grhIdx + 1;
      const grtTx = numAt(grt.raw, 8, 16);
      const grtRec = numAt(grt.raw, 16, 24);
      if (grtRec !== null && grtRec !== groupRecords) out.push(ctx.issue('error', 'count', `GRT record count ${grtRec} does not match the actual ${groupRecords} records in the group.`, [grt.line]));
      if (grtTx !== null && grtTx !== txCount) out.push(ctx.issue('error', 'count', `GRT transaction count ${grtTx} does not match the actual ${txCount} transactions.`, [grt.line]));
    }

    return out;
  },
};
