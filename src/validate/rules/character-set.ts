// Layer 3: the CIS character set on names and titles.
//
// CWR19-1070 requires names and titles to use only characters from the "Names" and "Titles"
// sections of the allowed CIS character set: §4.2 p28 FV24 (work title), §5.4 p42 FV37 (publisher
// name), §5.9 p48 FV29 and FV30 (writer names), §5.15 p53 FV4 and FV5 (alternate title), §5.19 p58
// FV4 and FV5 (performing artist), §5.21 p60 FV15, FV16 and FV17 (recording titles).
//
// ── What this can and cannot check ──────────────────────────────────────────────────────────────
//
// The CIS character set table is not published with the specification and is not distributed here,
// so the exact permitted set is unavailable. Printable ASCII is a strict superset of it: every CIS
// character is printable ASCII, but not every printable ASCII character is a CIS character.
//
// Checking against the superset therefore gives a sound lower bound. Anything it flags is certainly
// outside the CIS set, so there are no false positives. What it misses are characters that are
// printable ASCII yet outside the CIS subset, which it cannot see without the table.
//
// A rule that catches most of a defect and says so beats no rule and beats a rule that pretends to
// completeness. The message states the limit.

import type { CwrIssue } from '../types';
import type { TxRule } from '../context';
import { extractRecord } from '../grammar/extract';

/** Printable ASCII, the superset of every CIS "Names" and "Titles" character. */
const NON_PRINTABLE_ASCII = /[^\x20-\x7E]/g;

/** The name and title fields each record type carries, with the rule that governs them. */
const GOVERNED: Record<string, { key: string; label: string; cite: string; severity: 'error' | 'warning' }[]> = {
  NWR: [{ key: 'work_title', label: 'Work Title', cite: '§4.2 p28 field validation 24, TR', severity: 'error' }],
  REV: [{ key: 'work_title', label: 'Work Title', cite: '§4.2 p28 field validation 24, TR', severity: 'error' }],
  SPU: [{ key: 'publisher_name', label: 'Publisher Name', cite: '§5.4 p42 field validation 37, TR', severity: 'error' }],
  OPU: [{ key: 'publisher_name', label: 'Publisher Name', cite: '§5.4 p42 field validation 37, TR', severity: 'error' }],
  SWR: [
    { key: 'writer_last_name', label: 'Writer Last Name', cite: '§5.9 p48 field validation 29, TR', severity: 'error' },
    { key: 'writer_first_name', label: 'Writer First Name', cite: '§5.9 p48 field validation 30, TR', severity: 'error' },
  ],
  OWR: [
    { key: 'writer_last_name', label: 'Writer Last Name', cite: '§5.9 p48 field validation 29, TR', severity: 'error' },
    { key: 'writer_first_name', label: 'Writer First Name', cite: '§5.9 p48 field validation 30, TR', severity: 'error' },
  ],
  ALT: [{ key: 'alternate_title', label: 'Alternate Title', cite: '§5.15 p53 field validation 4, RR', severity: 'error' }],
  PER: [
    { key: 'performing_artist_last_name', label: 'Performing Artist Last Name', cite: '§5.19 p58 field validation 4, RR', severity: 'error' },
    { key: 'performing_artist_first_name', label: 'Performing Artist First Name', cite: '§5.19 p58 field validation 5, RR', severity: 'error' },
  ],
  REC: [
    { key: 'recording_title', label: 'Recording Title', cite: '§5.21 p60 field validation 16, TR', severity: 'error' },
    { key: 'version_title', label: 'Version Title', cite: '§5.21 p60 field validation 17, TR', severity: 'error' },
    { key: 'first_album_title', label: 'First Album Title', cite: '§5.21 p60 field validation 15, FR', severity: 'warning' },
  ],
};

/** Name the offending characters, so the reader can find them without hunting. */
function offenders(value: string): string {
  const found = [...new Set(value.match(NON_PRINTABLE_ASCII) ?? [])];
  return found
    .map((c) => {
      const code = c.codePointAt(0)!;
      return code < 0x20 || code === 0x7f ? `U+${code.toString(16).toUpperCase().padStart(4, '0')}` : `"${c}"`;
    })
    .slice(0, 5)
    .join(', ');
}

export const characterSetRule: TxRule = {
  id: 'CHARACTER_SET',
  category: 'field',
  layer: 3,
  phase: 11,
  run(ctx) {
    const out: CwrIssue[] = [];
    for (const r of ctx.readable) {
      const governed = GOVERNED[r.type];
      if (!governed) continue;
      const record = extractRecord(r.raw);
      if (!record) continue;
      for (const { key, label, cite, severity } of governed) {
        const value = record.fields.get(key)?.value;
        if (!value || !NON_PRINTABLE_ASCII.test(value)) continue;
        NON_PRINTABLE_ASCII.lastIndex = 0;
        out.push(ctx.issue(severity, 'field', `${label} contains ${offenders(value)}, which is outside printable ASCII and so outside the CIS character set (CWR19-1070 ${cite}). The CIS table is not published with the specification, so this checks the printable-ASCII superset: what it flags is certainly invalid, and it cannot see ASCII characters that fall outside the CIS subset.`, [r.line], 'FR'));
      }
    }
    return out;
  },
};
