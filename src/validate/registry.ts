// The rule registry: the coverage ledger. Every rule is listed here with its layer/category/phase
// metadata; as phases land, new rules register behind their phase. The orchestrator runs FILE_RULES
// (Layer 4) then, per transaction, TX_RULES (Layer 3). The per-rule test matrix is generated from
// these arrays.

import { FILE_RULES } from './rules/file';
import { TX_RULES } from './rules/transaction';
import { countsRule } from './rules/counts';
import { pwrLinkMissingRule, pwrSeqMismatchRule } from './rules/links';
import { mandatoryRule } from './rules/mandatory';
import { ipiFormatRule } from './rules/field-formats';
import { recordOrderRule } from './rules/ordering';
import { txSequenceRule, recordSequenceRule } from './rules/sequence';
import { ipUniqueRule } from './rules/ip-uniqueness';
import { publisherRoleRule, writerDesignationRule, eBeforeAmRule } from './rules/codes';
import { appendixAPerformanceRule } from './rules/appendix-a';
import { territoryIeContradictionRule } from './rules/territory';
import { lookupCodeRule } from './rules/lookup';
import { fieldFormatRule } from './rules/field-format';
import { checkDigitRule } from './rules/check-digit';
import { workHeaderRequiredRule, workWriterRequiredRule, publisherTerritoryRequiredRule, writerTerritoryRequiredRule } from './rules/required-records';
import { territoryOverlapRule } from './rules/territory-overlap';
import { mandatoryFieldRule } from './rules/mandatory-fields';
import { envelopeFieldRule } from './rules/envelope-fields';
import { duplicateWorkRule } from './rules/duplicate-work';
import { partyIdentityRule } from './rules/party-identity';
import { senderRegisterRule } from './rules/sender-register';
import { envelopeConstantRule } from './rules/envelope-constants';
import { publisherChainRule } from './rules/publisher-chain';
import { conditionalRecordsRule } from './rules/conditional-records';
import { transactionSharesRule } from './rules/transaction-shares';
import { conditionalFieldRule } from './rules/conditional-fields';
import { territoryRecordRule } from './rules/territory-records';
import { recordPrefixRule } from './rules/record-prefix';
import { recordingIdentifierRule } from './rules/recording-identifiers';
import { characterSetRule } from './rules/character-set';
import { partyConsistencyRule } from './rules/party-consistency';
import type { CwrRule, FileRule, TxRule } from './context';

export const FILE_RULE_LIST: FileRule[] = [...FILE_RULES, countsRule, txSequenceRule, workHeaderRequiredRule, envelopeFieldRule, duplicateWorkRule, partyIdentityRule, senderRegisterRule, envelopeConstantRule, recordPrefixRule];
export const TX_RULE_LIST: TxRule[] = [
  conditionalRecordsRule,
  ...TX_RULES,
  pwrLinkMissingRule,
  pwrSeqMismatchRule,
  mandatoryRule,
  ipiFormatRule,
  recordOrderRule,
  recordSequenceRule,
  ipUniqueRule,
  publisherRoleRule,
  writerDesignationRule,
  eBeforeAmRule,
  appendixAPerformanceRule,
  territoryIeContradictionRule,
  lookupCodeRule,
  fieldFormatRule,
  checkDigitRule,
  workWriterRequiredRule,
  publisherTerritoryRequiredRule,
  writerTerritoryRequiredRule,
  territoryOverlapRule,
  mandatoryFieldRule,
  publisherChainRule,
  transactionSharesRule,
  conditionalFieldRule,
  territoryRecordRule,
  recordingIdentifierRule,
  characterSetRule,
  partyConsistencyRule,
];
export const ALL_RULES: CwrRule[] = [...FILE_RULE_LIST, ...TX_RULE_LIST];
