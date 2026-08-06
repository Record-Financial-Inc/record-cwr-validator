// Layer 4: file/group rules. Issues are file-scoped (txSeq: null).

import type { HeaderRecord } from '../../parse/parse-cwr';
import { CWR_RECORD_LENGTHS } from '../../spec/record-lengths';
import type { CwrIssue } from '../types';
import type { FileRule } from '../context';

/** Where each record's format is defined in CWR19-1070, so a framing error cites its source. */
const SPEC_REF: Record<string, string> = {
  HDR: '§3.5 p14-15', GRH: '§3.6 p16', GRT: '§3.7 p17', TRL: '§3.8 p17',
  NWR: '§4.2 p22-25', REV: '§4.3', ISW: '§4.4', EXC: '§4.5',
  SPU: '§5.4 p39-40', OPU: '§5.5', SPT: '§5.7 p44', OPT: '§5.8 p44',
  SWR: '§5.9 p46-48', OWR: '§5.10 p46-48', SWT: '§5.12 p50', OWT: '§5.13 p50',
  PWR: '§5.14 p52', ALT: '§5.15 p54', PER: '§5.19 p58', REC: '§5.21 p60',
};

/** Fixed-width framing: record-type widths, HDR first, GRT before TRL at the end. */
export const framingRule: FileRule = {
  id: 'FRAMING',
  category: 'structure',
  layer: 4,
  phase: 0,
  run(ctx) {
    const out: CwrIssue[] = [];
    const { records, parsed } = ctx;
    if (records.length === 0) {
      out.push(ctx.issue('error', 'structure', 'File is empty and has no HDR transmission header.', [], 'ER'));
      return out;
    }
    // Framing defects group by (record type, actual width). A file padded to a universal width
    // produces one defect per record type, not one per record: 1,611 copies of an identical
    // sentence describe the file no better than thirteen do, and drown everything else.
    if (parsed.malformedLines.length) {
      const malformed = new Set(parsed.malformedLines);
      const groups = new Map<string, { type: string; actual: number; expected: number; lines: number[] }>();
      for (const r of records) {
        if (!malformed.has(r.line)) continue;
        const expected = CWR_RECORD_LENGTHS[r.type];
        if (expected === undefined) continue;
        const key = `${r.type}|${r.raw.length}`;
        const g = groups.get(key);
        if (g) g.lines.push(r.line);
        else groups.set(key, { type: r.type, actual: r.raw.length, expected, lines: [r.line] });
      }
      for (const g of groups.values()) {
        const n = g.lines.length;
        out.push(ctx.issue(
          'error',
          'structure',
          `${g.type}: ${n} record${n === 1 ? ' is' : 's are'} ${g.actual} characters, expected ${g.expected} (CWR19-1070 ${SPEC_REF[g.type] ?? 'record format'}). Field positions after the 19-character prefix do not line up, so this record's fields cannot be read.`,
          g.lines.slice(0, 5),
          // §2.1 field validation 9 grades the record length ER, but societies ingest right-trimmed
          // records in practice. The record is what cannot be read, so RR is what is true of it.
          'RR',
        ));
      }
      // Never skip silently: say how much of the file went unchecked, and why.
      const readable = records.length - malformed.size;
      out.push(ctx.issue(
        'error',
        'structure',
        `${malformed.size} of ${records.length} records could not be read because their framing is broken, so field-level checks were skipped for them. ${readable} record${readable === 1 ? ' was' : 's were'} checked in full. Fix the record widths and validate again.`,
        [],
        // A coverage statement about records, not a defect in the transmission envelope.
        'RR',
      ));
    }
    if (records[0].type !== 'HDR') {
      out.push(ctx.issue('error', 'structure', 'File does not start with an HDR transmission header.', [records[0].line], 'ER'));
    }
    const grhRecords = records.filter((r) => r.type === 'GRH');
    if (grhRecords.length === 0) {
      out.push(ctx.issue('error', 'structure', 'Missing GRH group header immediately after HDR.', [records[0].line], 'ER'));
    } else if (grhRecords.length > 1) {
      out.push(ctx.issue('error', 'structure', 'File contains multiple GRH group headers, but this export profile supports one NWR group.', grhRecords.map((r) => r.line), 'ER'));
    }
    if (records[1]?.type !== 'GRH') {
      out.push(ctx.issue('error', 'structure', 'GRH group header must appear immediately after HDR.', [records[1]?.line ?? records[0].line], 'ER'));
    }
    // TRL (transmission) and GRT (group) trailers are MANDATORY. A file missing either has a
    // truncated envelope: it would pass our gate and ship to a society/the PRO, which rejects it. So a
    // missing trailer blocks (error), not warns, and validateCwr returns ok: false.
    const last = records[records.length - 1];
    if (last.type !== 'TRL') {
      out.push(ctx.issue('error', 'structure', 'File does not end with a TRL transmission trailer. The transmission envelope is truncated (CWR19-1070 §3.8 p17; TRL field validations are ER, entire file rejected).', [last.line], 'ER'));
    }
    // The GRT sits immediately before the TRL (or is the last record when the TRL is missing). Checked
    // independently of the TRL so a file missing BOTH trailers reports both, not just one.
    const beforeTrl = records[last.type === 'TRL' ? records.length - 2 : records.length - 1];
    if (beforeTrl && beforeTrl.type !== 'GRT') {
      out.push(ctx.issue('error', 'structure', 'Missing GRT group trailer before the TRL. The group envelope is truncated (CWR19-1070 §3.7 p17; GRT field validations are GR, group rejected).', [beforeTrl.line], 'GR'));
    }
    return out;
  },
};

/**
 * The HDR must carry a Sender ID (CWR19-1070 §3.5 p14 field validation 3, ER).
 *
 * Reads from `readable`: the Sender ID is a field, so a mis-framed HDR yields whatever bytes sit at
 * that offset. Reporting "missing Sender ID" from a header we cannot parse would be inventing a
 * second defect out of the first one, which the framing rule has already reported.
 */
export const headerRule: FileRule = {
  id: 'HEADER_SENDER_ID',
  category: 'header',
  layer: 4,
  phase: 0,
  run(ctx) {
    const hdr = ctx.readable.find((r): r is HeaderRecord => r.type === 'HDR');
    if (!hdr) return [];
    const senderIdEmpty = !hdr.senderId || /^[0\s]*$/.test(hdr.senderId);
    return senderIdEmpty
      ? [ctx.issue('error', 'header', 'Missing Sender ID in the HDR (CWR19-1070 §3.5 p14 field validation 3, ER: entire file rejected).', [hdr.line])]
      : [];
  },
};

export const FILE_RULES: FileRule[] = [framingRule, headerRule];
