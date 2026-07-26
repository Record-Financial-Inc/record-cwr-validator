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
export { CWR_ISSUE_CATEGORIES } from './validate/types';
export type {
  CwrIssue,
  CwrIssueCategory,
  CwrSeverity,
  CwrValidationResult,
} from './validate/types';

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
