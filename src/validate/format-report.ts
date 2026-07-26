// The findings as text: the complete report, for handing to whoever produced the file.
//
// The screen is necessarily bounded: a badly framed submission carries six figures of findings,
// and drawing one node each is what took the page down with the file. Bounding it means the screen
// always shows a view, never the whole thing. This is the whole thing.

import type { CwrIssueCategory, CwrValidationResult } from './types';
import { issueCount } from './types';
import { groupByRule, CWR_REPORT_ORDER } from './group-by-rule';

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

// The "how to fix" half of each category: one calm sentence, stated once above its group so a long
// failure list stays actionable without repeating the same remedy on every row.
//
// These cite the standard rather than a destination. Every society validates against CWR19-1070;
// naming one of them here would tell a reader that the rule is that society's preference, when it
// is the specification's requirement. The destination belongs on the export action, not the verdict.
export const CWR_CATEGORY_FIX: Record<CwrIssueCategory, string> = {
  overclaim: 'Each right (PR / MR / SR) must total exactly 100% across all parties, within the ±0.06% the specification allows. Over 100% means two parties claim the same slice; under 100% means a co-writer or publisher is missing, so the work is under-registered and those royalties go uncollected.',
  duplicate: 'A party is filed twice, or one identifier names two parties. An Interested Party # must identify exactly one party, and one party must carry exactly one number.',
  territory: 'Collection in a territory exceeds 100%, so rights overlap or are over-claimed for that region. Make the TIS coverage disjoint.',
  link: 'Every controlled writer must link to a publisher through a PWR record, and that link must point at a real publisher chain in the work.',
  count: 'The GRT and TRL trailers must report exactly the records and transactions they frame. A file whose counts disagree is rejected on the trailer.',
  ordering: 'Records must follow CWR order within a work: NWR → publishers → writers → alternate titles → recording.',
  mandatory: 'A field the specification marks mandatory is missing: a work title, a writer’s last name, a publisher name.',
  field: 'A field’s format is invalid, such as an IPI Name Number that is not 9 to 11 digits.',
  sequence: 'Transaction and record sequence numbers must increase in order, starting at zero, without gaps or duplicates.',
  header: 'The transmission header identifies the submitter. Its rules are the most severe in the specification: a file that breaks one is rejected in full before any work is read, which is why it comes back with no acknowledgement.',
  structure: 'The file’s structure is wrong: either a record is not the width its record type specifies, or a record the specification requires is absent. Records are fixed-width and framed HDR → GRH → GRT → TRL, and a controlled party needs its territory and link records.',
};

export interface CwrReportMeta {
  /** What was validated: a filename, or a catalogue name for a pre-flight. */
  source: string;
  /** ISO timestamp, passed in rather than read, so this stays a pure function. */
  at?: string;
}

const rule = (char: string, n = 78) => char.repeat(n);

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
      for (const { issue, values, count } of group.instances) {
        const parts = [
          values.join(' '),
          issue.workTitle ?? '',
          count > 1 ? `×${count.toLocaleString()}` : '',
          issue.records.length ? `L${issue.records.join(', L')}${issue.truncatedRecords ? '…' : ''}` : '',
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
