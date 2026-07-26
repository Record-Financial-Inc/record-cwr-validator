// Grouping findings by the rule they break, for any surface that has to present them.
//
// Shared by the on-screen report and the downloadable one so the two can never disagree about what
// the file contains: the screen is a bounded view of exactly this grouping, the download is all of
// it.

import type { CwrIssue, CwrIssueCategory, CwrSeverity } from './types';

/** The prefix every specification reference carries. */
const CITATION_PREFIX = 'CWR19-1070';
/** The quoted literals a finding embeds: the part that differs between instances of one rule. */
const QUOTED = /"[^"]*"/g;

/**
 * Split off a trailing "(CWR19-1070 §5.21 p60 field validation 9, FR: the field is rejected)."
 *
 * Done by scanning rather than by matching. The obvious pattern for this: `/\s*\((CWR19-1070[^)]*)\)\.?\s*$/`
 *: is quadratic on adversarial input, because an unanchored leading `\s*` makes the engine retry
 * from every position. Messages are ours, but this ships as a library that takes findings from its
 * caller, so it has no business being quadratic on any of them.
 */
function splitCitation(message: string): { body: string; citation: string | null } {
  let end = message.trimEnd();
  if (end.endsWith('.')) end = end.slice(0, -1);
  if (!end.endsWith(')')) return { body: message.trim(), citation: null };
  const open = end.lastIndexOf('(');
  if (open < 0) return { body: message.trim(), citation: null };
  const inner = end.slice(open + 1, -1);
  if (!inner.startsWith(CITATION_PREFIX)) return { body: message.trim(), citation: null };
  return { body: end.slice(0, open).trim(), citation: inner };
}

/** One finding, plus how many records carry it. */
export interface RuleInstance {
  issue: CwrIssue;
  /** The offending values this instance names, e.g. `["00031520"]`. */
  values: string[];
  count: number;
}

/** One rule, and every value in the file that breaks it. */
export interface RuleGroup {
  /** The rule as a sentence, with the offending value masked out. */
  rule: string;
  /** The specification reference, lifted out so it is stated once rather than on every row. */
  citation: string | null;
  severity: CwrSeverity;
  /** Findings this rule accounts for across the file, counting collapsed repeats. */
  total: number;
  instances: RuleInstance[];
}

/**
 * Separate the rule a finding states from the value that instance carries.
 *
 * Most findings embed the record's own value ("EAN \"00031520\" is not a valid…"), so no two are
 * identical and nothing collapses. Read a list of those and you cannot see that they are one rule
 * broken ten times: the rule sentence is retyped in full on every row, and the values: the only
 * part that differs, and the only part you can act on: are buried mid-sentence. Masking the quoted
 * literal recovers the rule; the literal becomes the row.
 */
function ruleOf(issue: CwrIssue): { rule: string; citation: string | null; values: string[] } {
  const { body, citation } = splitCitation(issue.message);
  const rule = body.replace(QUOTED, '"…"');
  return {
    rule: /[.!?]$/.test(rule) ? rule : `${rule}.`,
    citation,
    values: body.match(QUOTED) ?? [],
  };
}

/**
 * Group findings by the rule they break, in first-appearance order.
 *
 * `occurrences` is the engine's own count of a finding repeated within one work; it is summed here
 * rather than counting objects, so a defect on fifty records of one work reads as fifty and not as
 * one.
 */
export function groupByRule(issues: readonly CwrIssue[]): RuleGroup[] {
  const byRule = new Map<string, RuleGroup>();
  const order: RuleGroup[] = [];
  for (const issue of issues) {
    const { rule, citation, values } = ruleOf(issue);
    let group = byRule.get(rule);
    if (!group) {
      group = { rule, citation, severity: issue.severity, total: 0, instances: [] };
      byRule.set(rule, group);
      order.push(group);
    }
    // One error among warnings colours the group as an error: the worse severity is the actionable one.
    if (issue.severity === 'error') group.severity = 'error';
    const count = issue.occurrences ?? 1;
    group.total += count;
    const same = group.instances.find((i) => i.issue.message === issue.message);
    if (same) same.count += count;
    else group.instances.push({ issue, values, count });
  }
  return order;
}

/**
 * The order findings are presented in, most consequential first.
 *
 * Envelope before rights before records. A file that breaks a header rule is rejected in full
 * before a single work is read, so nothing below it matters until it is fixed: and a reader with
 * seven hundred findings will not scroll to the bottom to discover that. Framing comes next because
 * an unreadable record is one whose field checks did not run at all. Then the rights defects that
 * cost money, then the per-record ones that cost a record.
 *
 * Exported so a test can assert it stays exhaustive over `CwrIssueCategory` (invariant I4): a
 * category absent here renders nothing at all.
 */
export const CWR_REPORT_ORDER: CwrIssueCategory[] = [
  'header', 'structure', 'count',
  'overclaim', 'duplicate', 'territory', 'link',
  'ordering', 'mandatory', 'field', 'sequence',
];
