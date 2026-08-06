// The abbreviations this engine puts in front of a person, and what each one means.
//
// A CWR finding cannot avoid abbreviations: the record types ARE three-letter codes, and the
// specification grades every rule with a two-letter severity. But an abbreviation the reader cannot
// expand is not information, it is a lookup task handed to someone who came here for an answer. So
// every abbreviation this engine shows carries its full term and one plain sentence.
//
// Record-type terms come from the generator (core/generators/cwr/record-builders.ts), which names
// each record it writes. Keeping one spelling means the validator cannot call a record something
// the generator calls something else.
//
// `tests/unit/core/validation/cwr/glossary.test.ts` fails when copy shows an abbreviation that is
// not here, so this stays complete on its own rather than by anyone remembering to update it.

/**
 * The families the abbreviations fall into.
 *
 * Structure, not decoration: the on-screen Key groups by this, so the groups have one definition
 * rather than a second list somebody has to keep in step with this one.
 */
export const CWR_TERM_GROUPS = ['grade', 'envelope', 'transaction', 'party', 'identifier', 'right', 'standard'] as const;
export type CwrTermGroup = (typeof CWR_TERM_GROUPS)[number];

/** One abbreviation: the full term, and what it is in one sentence. */
export interface CwrTerm {
  group: CwrTermGroup;
  /** The full term, in the specification's own words. */
  full: string;
  /** What it is, in one sentence a person outside the industry can read. */
  gloss: string;
}

export const CWR_GLOSSARY = {
  // ── The standard and the bodies ────────────────────────────────────────────────────────────────
  CWR: { group: 'standard', full: 'Common Works Registration', gloss: 'The file format that music publishers use to register works with a society.' },
  CISAC: { group: 'standard', full: 'International Confederation of Societies of Authors and Composers', gloss: 'The body that writes and maintains the CWR specification.' },
  EDI: { group: 'standard', full: 'Electronic Data Interchange', gloss: 'The standard that sets the shape of the file envelope.' },

  // ── Envelope records ───────────────────────────────────────────────────────────────────────────
  HDR: { group: 'envelope', full: 'Transmission Header', gloss: 'The first line of the file. It says who sent the file.' },
  GRH: { group: 'envelope', full: 'Group Header', gloss: 'The line that starts a group of registrations.' },
  GRT: { group: 'envelope', full: 'Group Trailer', gloss: 'The line that ends a group. It counts the records in the group.' },
  TRL: { group: 'envelope', full: 'Transmission Trailer', gloss: 'The last line of the file. It counts the groups and the records.' },

  // ── Transaction records ────────────────────────────────────────────────────────────────────────
  NWR: { group: 'transaction', full: 'New Work Registration', gloss: 'The line that starts a work. Each work in the file has one.' },
  REV: { group: 'transaction', full: 'Revised Registration', gloss: 'The line that starts a work you registered before and now correct.' },
  ALT: { group: 'transaction', full: 'Alternate Title', gloss: 'Another title for the same work.' },
  REC: { group: 'transaction', full: 'Recording Detail', gloss: 'The line that describes a recording of the work.' },

  // ── Party records ──────────────────────────────────────────────────────────────────────────────
  SPU: { group: 'party', full: 'Publisher Controlled by Submitter', gloss: 'A publisher that you represent. You claim a share for this publisher.' },
  OPU: { group: 'party', full: 'Other Publisher', gloss: 'A publisher that you do not represent. You claim no share for this publisher.' },
  SWR: { group: 'party', full: 'Writer Controlled by Submitter', gloss: 'A writer that you represent. You claim a share for this writer.' },
  OWR: { group: 'party', full: 'Other Writer', gloss: 'A writer that you do not represent. You claim no share for this writer.' },
  SPT: { group: 'party', full: 'Publisher Territory of Control', gloss: 'The line that gives a publisher its collection share in one territory.' },
  SWT: { group: 'party', full: 'Writer Territory of Control', gloss: 'The line that gives a writer its collection share in one territory.' },
  PWR: { group: 'party', full: 'Publisher for Writer', gloss: 'The line that connects a writer to the publisher that collects for that writer.' },

  // ── Identifiers ────────────────────────────────────────────────────────────────────────────────
  IPI: { group: 'identifier', full: 'Interested Party Information', gloss: 'The number that identifies one writer or one publisher worldwide.' },
  IPNN: { group: 'identifier', full: 'IPI Name Number', gloss: 'The IPI number for one name that a party uses.' },
  ISWC: { group: 'identifier', full: 'International Standard Musical Work Code', gloss: 'The number that identifies one work worldwide.' },
  ISRC: { group: 'identifier', full: 'International Standard Recording Code', gloss: 'The number that identifies one recording worldwide.' },
  TIS: { group: 'identifier', full: 'Territory Information System', gloss: 'The CISAC list of codes for countries and groups of countries.' },
  EAN: { group: 'identifier', full: 'European Article Number', gloss: 'The 13-digit bar code number of a release.' },
  UPC: { group: 'identifier', full: 'Universal Product Code', gloss: 'The 12-digit bar code number of a release. It is used in North America.' },

  // ── The three rights ───────────────────────────────────────────────────────────────────────────
  PR: { group: 'right', full: 'Performing Rights', gloss: 'The right to play the work in public, on radio, or in a stream.' },
  MR: { group: 'right', full: 'Mechanical Rights', gloss: 'The right to make a copy of the work.' },
  SR: { group: 'right', full: 'Synchronization Rights', gloss: 'The right to use the work with a picture, in a film or an advertisement.' },

  // ── Severity grades, from the specification ────────────────────────────────────────────────────
  ER: { group: 'grade', full: 'Entire File Rejected', gloss: 'The society refuses the whole file. No work in the file is registered.' },
  GR: { group: 'grade', full: 'Group Rejected', gloss: 'The society refuses one group of registrations.' },
  TR: { group: 'grade', full: 'Transaction Rejected', gloss: 'The society refuses one work. The other works are registered.' },
  RR: { group: 'grade', full: 'Record Rejected', gloss: 'The society refuses one line. The work is still registered.' },
  FR: { group: 'grade', full: 'Field Rejected', gloss: 'The society ignores one field. The work is still registered.' },
} as const satisfies Record<string, CwrTerm>;

export type CwrTermKey = keyof typeof CWR_GLOSSARY;

/** Every abbreviation, longest first, so a scan matches IPNN before IPI. */
const KEYS = (Object.keys(CWR_GLOSSARY) as CwrTermKey[]).sort((a, b) => b.length - a.length);

export function cwrTerm(key: string): CwrTerm | null {
  return (CWR_GLOSSARY as Record<string, CwrTerm>)[key] ?? null;
}

/**
 * Split a sentence into plain text and the abbreviations in it.
 *
 * A surface uses this to show the full term for each abbreviation, without a writer having to mark
 * up each one by hand. Marking them by hand is what goes stale: a new finding gets written, the
 * markup does not, and that abbreviation alone becomes silent.
 */
export function splitTerms(text: string): Array<{ text: string; term: CwrTermKey | null }> {
  const pattern = new RegExp(`\\b(${KEYS.join('|')})\\b`, 'g');
  const out: Array<{ text: string; term: CwrTermKey | null }> = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const at = match.index;
    if (at > last) out.push({ text: text.slice(last, at), term: null });
    out.push({ text: match[1], term: match[1] as CwrTermKey });
    last = at + match[1].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), term: null });
  return out;
}
