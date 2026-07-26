/**
 * A CWR 2.2 reader and validator, checked against CISAC CWR19-1070.
 *
 * Every rule cites the section, page and severity it comes from. Severities are the
 * specification's own: ER entire file rejected, GR group rejected, TR transaction rejected,
 * RR record rejected, FR field rejected.
 */

export { parseCwr } from './parse/parse-cwr';
export type {
  ParsedCwr,
  CwrRecord,
  HeaderRecord,
  WorkRecord,
  PublisherRecord,
  PublisherTerritoryRecord,
  WriterRecord,
  WriterTerritoryRecord,
  PublisherWriterRecord,
  OtherRecord,
  RightShares,
} from './parse/parse-cwr';

export { validateCwr } from './validate/validate-cwr';
export { CWR_ISSUE_CATEGORIES, issueCount } from './validate/types';
export type {
  CwrIssue,
  CwrIssueCategory,
  CwrSeverity,
  CwrValidationResult,
} from './validate/types';

/**
 * Presenting the findings.
 *
 * `issueCount` is the count to show a person: identical findings arrive merged into one entry
 * carrying `occurrences`, so counting entries understates a real file. `groupByRule` gathers
 * findings that differ only in the value they name, which is most of them: without it, one rule
 * broken ten times reads as ten paragraphs. `formatCwrReport` renders the lot as text.
 */
export { groupByRule, CWR_REPORT_ORDER } from './validate/group-by-rule';
export type { RuleGroup, RuleInstance } from './validate/group-by-rule';
export { formatCwrReport, CWR_CATEGORY_LABEL, CWR_CATEGORY_FIX } from './validate/format-report';
export type { CwrReportMeta } from './validate/format-report';

export { ALL_RULES, FILE_RULE_LIST, TX_RULE_LIST } from './validate/registry';

/**
 * The CWR Sender ID and Codes Table (CWR06-1972) is a CISAC members-only document, so it is not
 * distributed here. Supply it to enable the HDR sender checks of §3.5 p14 field validations 3, 5
 * and 12, all of which are ER. Without it those checks report as unverifiable rather than passing:
 * an ER-severity rule that could not run is not a pass.
 */
export { setCwrSenderRegister } from './validate/rules/sender-register';
export type { CwrSenderRegister, CwrSenderEntry } from './validate/rules/sender-register';

export { CWR_RECORD_LENGTHS, cwrRecordLength } from './spec/record-lengths';
