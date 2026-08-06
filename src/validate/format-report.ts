// The findings as text: the complete report, for handing to whoever produced the file.
//
// The screen is necessarily bounded: a badly framed submission carries six figures of findings,
// and drawing one node each is what took the page down with the file. Bounding it means the screen
// always shows a view, never the whole thing. This is the whole thing.

import type { CwrIssueCategory, CwrValidationResult } from './types';
import { issueCount } from './types';
import { groupByRule, CWR_REPORT_ORDER } from './group-by-rule';
import { verdictLead } from './verdict';
import type { CwrVerdictSummary } from './verdict';

export const CWR_CATEGORY_LABEL: Record<CwrIssueCategory, string> = {
  // The 'overclaim' category covers both directions of a per-right total that isn't 100%: hence "Ownership".
  overclaim: 'Ownership',
  duplicate: 'Duplicates',
  territory: 'Territories',
  link: 'Publisher links',
  count: 'Trailer counts',
  ordering: 'Record order',
  mandatory: 'Missing fields',
  field: 'Field formats',
  sequence: 'Sequence',
  header: 'Header',
  structure: 'Structure',
};

// The "how to fix" half of each category: stated once above its group, so a long failure list stays
// actionable and no remedy repeats on every row.
//
// These cite the standard and not a destination. Every society validates against CWR19-1070. If we
// named one society here, a reader could think that the rule is that society's preference, when the
// rule is the specification's requirement. The destination belongs on the export action.
//
// Written to ASD-STE100 (Simplified Technical English): one topic per sentence, active voice, the
// simple present tense, and a maximum of 25 words in a sentence. The readers are publishing
// administrators and society staff, and English is not the first language of many of them. A rights
// error is expensive, so the sentence that explains it must not also need decoding. Every
// abbreviation here is in `glossary.ts`, and a test fails if one is not.
export const CWR_CATEGORY_FIX: Record<CwrIssueCategory, string> = {
  overclaim:
    'Each right must have a total of exactly 100% from all parties. The three rights are PR, MR and SR. The specification permits a tolerance of 0.06%. A total of more than 100% shows that two parties claim the same share. A total of less than 100% shows that a writer or a publisher is not in the file. The society cannot pay the royalties for that share.',
  duplicate:
    'The file records one party two times, or one number identifies two different parties. Each IPI number must identify only one party. Each party must have only one IPI number.',
  territory:
    'The collection shares for a territory have a total of more than 100%. Two parties claim the same territory. Change the TIS codes, and give each party a different territory.',
  link:
    'Each writer that you represent must connect to a publisher. A PWR record makes this connection. The PWR record must point to a publisher that is also in the same work.',
  count:
    'The GRT record and the TRL record give a count of the records before them. These counts must agree with the file. If a count does not agree, the society refuses the file at that trailer.',
  ordering:
    'The records of a work must be in the sequence that CWR specifies. The sequence is: NWR first, then the publishers, then the writers, then the alternate titles, then the recording.',
  mandatory:
    'A field that the specification makes mandatory is empty. Examples are the title of the work, the last name of a writer, and the name of a publisher. Put a value in each mandatory field.',
  field:
    'A field has a value in the wrong format. For example, an IPNN must have 9 to 11 digits. Correct the value, and keep the format that the specification gives for that field.',
  sequence:
    'Each work and each record has a sequence number. These numbers start at zero. Each number must be one more than the number before it. Do not leave a gap, and do not use a number two times.',
  header:
    'The HDR record identifies you as the sender. Its rules are the most severe rules in the specification. If the HDR record is wrong, the society refuses the file before it reads a work. The society then sends no acknowledgement, because it read no work to report on.',
  structure:
    'The file has the wrong shape. Each record must have the width that the specification gives for its record type. The envelope must be in this sequence: HDR, GRH, GRT, TRL. Each party that you represent must also have its territory record and its link record.',
};

export interface CwrReportMeta {
  /** What was validated: a filename, or a catalogue name for a pre-flight. */
  source: string;
  /** ISO timestamp, passed in rather than read, so this stays a pure function. */
  at?: string;
}

const rule = (char: string, n = 78) => char.repeat(n);

/**
 * The stored verdict as text, for handing to whoever produced the file.
 *
 * Not the same artefact as `formatCwrReport`, and it must not pretend to be: the history keeps the
 * verdict and the counts, never the findings, so this carries no line numbers and no offending
 * values. It says so at the end, because a summary that reads as a full report sends someone to
 * the wrong argument with the wrong evidence.
 */
export function formatVerdictSummary(summary: CwrVerdictSummary, meta: CwrReportMeta): string {
  const out: string[] = ['CWR validation summary', rule('=')];
  out.push(`Source     ${meta.source}`);
  if (meta.at) out.push(`Validated  ${meta.at}`);
  out.push(`Contents   ${summary.works.toLocaleString()} works`);
  out.push('Standard   CISAC CWR19-1070 (CWR 2.2)');
  out.push('');
  out.push(`VERDICT    ${summary.errors.toLocaleString()} error(s) · ${summary.warnings.toLocaleString()} warning(s)`);
  out.push('');
  out.push(verdictLead(summary));

  for (const c of summary.categories) {
    out.push('');
    const counts = [c.errors > 0 ? `${c.errors.toLocaleString()} blocking` : '', c.warnings > 0 ? `${c.warnings.toLocaleString()} warning(s)` : '']
      .filter(Boolean)
      .join(' · ');
    out.push(`${CWR_CATEGORY_LABEL[c.category].toUpperCase()} (${counts})`);
    out.push(rule('-'));
    out.push(`  ${CWR_CATEGORY_FIX[c.category]}`);
  }

  out.push('');
  out.push(rule('-'));
  out.push('This is the summary, and not the full report. It gives no line numbers and no field');
  out.push('values. Validate the file again to get the full report.');
  out.push('');
  return out.join('\n');
}


/**
 * Render a validation result as plain text, complete and untruncated.
 *
 * Same grouping as the screen, so the two can never describe the file differently: but with every
 * rule and every offending value, because a file has no viewport to run out of.
 */
export function formatCwrReport(result: CwrValidationResult, meta: CwrReportMeta): string {
  const { ok, errors, warnings, recordCount, transactionCount } = result;
  const unverified = [...errors, ...warnings].filter((i) => i.unverified);
  const findings = [...errors, ...warnings].filter((i) => !i.unverified);
  const out: string[] = [];

  out.push('CWR validation report');
  out.push(rule('='));
  out.push(`Source     ${meta.source}`);
  out.push(`Contents   ${transactionCount.toLocaleString()} works · ${recordCount.toLocaleString()} records`);
  out.push('Standard   CISAC CWR19-1070 (CWR 2.2)');
  if (meta.at) out.push(`Validated  ${meta.at}`);
  out.push('');
  out.push(
    ok
      ? `VERDICT    ${unverified.length > 0 ? 'Valid, as far as we could check' : 'Valid: conforms to CWR 2.2'}`
      : `VERDICT    ${issueCount(errors).toLocaleString()} blocking issue${issueCount(errors) === 1 ? '' : 's'}`,
  );
  out.push(`           ${issueCount(errors).toLocaleString()} issues · ${issueCount(warnings).toLocaleString()} warnings`);

  if (unverified.length > 0) {
    out.push('');
    out.push(`CHECKS THAT COULD NOT BE RUN (${unverified.length})`);
    out.push(rule('-'));
    // Stated before the findings because it qualifies all of them: these are checks whose reference
    // data we do not hold, not defects found in the file.
    for (const issue of unverified) out.push(`  ${issue.message}`);
  }

  for (const category of CWR_REPORT_ORDER) {
    const inCategory = findings.filter((i) => i.category === category);
    if (inCategory.length === 0) continue;
    const groups = groupByRule(inCategory);
    const total = groups.reduce((sum, g) => sum + g.total, 0);
    out.push('');
    out.push(`${CWR_CATEGORY_LABEL[category].toUpperCase()} (${total.toLocaleString()}${groups.length > 1 ? `, ${groups.length} rules` : ''})`);
    out.push(rule('-'));
    out.push(`  ${CWR_CATEGORY_FIX[category]}`);
    for (const group of groups) {
      out.push('');
      out.push(`  [${group.severity === 'error' ? 'ERROR' : 'WARN '}] ${group.rule}  ×${group.total.toLocaleString()}`);
      if (group.citation) out.push(`          ${group.citation}`);
      for (const { issue, values, count, works, lines, moreLines } of group.instances) {
        const parts = [
          values.join(' '),
          // One value often spans many works (an EAN is an album barcode); naming the first would
          // present it as the only one.
          works > 1 ? `${works.toLocaleString()} works` : issue.workTitle ?? '',
          count > 1 ? `×${count.toLocaleString()}` : '',
          lines.length ? `L${lines.join(', L')}${moreLines ? '…' : ''}` : '',
        ].filter(Boolean);
        out.push(`          ${parts.join('  ')}`);
      }
    }
  }

  if (findings.length === 0 && unverified.length === 0) {
    out.push('');
    out.push('No issues: every work reconciles to 100% on each right, and no duplicate or overlapping records.');
  }

  out.push('');
  return out.join('\n');
}
