// The CWR field-requirements matrix: the single source of truth for field byte-positions, datatypes,
// presence (M/C/O) and lookup-table bindings, one entry per record type.
//
// Provenance: field order + sizes follow the CISAC CWR 2.2 record layout. For the records we GENERATE
// (HDR/GRH/NWR/ALT/SPU/SPT/SWR/SWT/PWR/REC/GRT/TRL and their O* twins) the widths are transcribed from
// core/generators/cwr/record-builders.ts: the authoritative byte-layout of the files we actually send
// to a society: and proven byte-identical by tests/integration/cwr-grammar.test.ts (generate → extract →
// equals input). They were cross-checked against the MIT weso/CWR-DataApi config; the one systematic
// divergence is duration fields, which CWR 2.2 specifies as 6 chars (HHMMSS) where that 2.1-era config
// used 8: our generator (and this matrix) follow the 2.2 width. The remaining ~20 record types we do
// not generate (AGR/TER/IPA/NPA/…) are added from that config in P10, where the parser exercises them.
//
// `source` on a field names its lookup table (P7 wires these to the vendored code lists). `lookup_int`
// is a numeric-coded lookup (society/TIS); `lookup` is an alpha-coded one.

import { FIELD_DEFS } from './field-defs';

export type CwrDatatype =
  | 'record_type'
  | 'alphanum'
  | 'alphanum_ext'
  | 'numeric'
  | 'date'
  | 'time'
  | 'percentage'
  | 'flag'
  | 'boolean'
  | 'blank'
  | 'lookup'
  | 'lookup_int'
  | 'ipi_name_n'
  | 'ipi_base_n'
  | 'iswc'
  | 'isrc'
  | 'ean13';

/** M = mandatory, C = conditional (required given other fields), O = optional. */
export type Presence = 'M' | 'C' | 'O';

export interface FieldSpec {
  key: string;
  name: string;
  start: number;
  len: number;
  datatype: CwrDatatype;
  presence: Presence;
  /** Lookup table id (a vendored CWR-DataApi code list), for coded fields. */
  source?: string;
}

/** A field as declared in a record layout, before its start position is computed. */
type FieldDecl = [key: string, name: string, len: number, datatype: CwrDatatype, presence?: Presence, source?: string];

interface RecordDecl {
  /** 'simple' records (HDR/GRH/GRT/TRL) carry only a 3-char record-type prefix; 'transaction'
   *  records (everything inside a work) also carry an 8-char transaction- and record-sequence number. */
  cls: 'simple' | 'transaction';
  /** Whether our generator emits this record (so it is byte-verified by the consistency test). */
  emitted: boolean;
  fields: FieldDecl[];
}

const f = (key: string, name: string, len: number, datatype: CwrDatatype, presence: Presence = 'O', source?: string): FieldDecl =>
  [key, name, len, datatype, presence, source];

// ── Prefixes ────────────────────────────────────────────────────────────────────────────────────
const SIMPLE_PREFIX: FieldDecl[] = [f('record_type', 'Record Type', 3, 'record_type', 'M')];
const TX_PREFIX: FieldDecl[] = [
  f('record_type', 'Record Type', 3, 'record_type', 'M'),
  f('transaction_sequence_n', 'Transaction Sequence #', 8, 'numeric', 'M'),
  f('record_sequence_n', 'Record Sequence #', 8, 'numeric', 'M'),
];

// ── Record layouts (emitted records: widths from record-builders.ts) ──────────────────────────────
const DECLS: Record<string, RecordDecl> = {
  HDR: {
    cls: 'simple', emitted: true, fields: [
      f('sender_type', 'Sender Type', 2, 'alphanum', 'M'),
      f('sender_id', 'Sender ID', 9, 'numeric', 'M'),
      f('sender_name', 'Sender Name', 45, 'alphanum', 'M'),
      f('edi_standard', 'EDI Standard Version', 5, 'lookup', 'M', 'edi_standard'),
      f('creation_date', 'Creation Date', 8, 'date', 'M'),
      f('creation_time', 'Creation Time', 6, 'time', 'M'),
      f('transmission_date', 'Transmission Date', 8, 'date', 'M'),
      f('character_set', 'Character Set', 15, 'blank', 'O', 'character_set'),
      f('cwr_version', 'CWR Version', 3, 'alphanum', 'O'),
      f('revision', 'Revision', 3, 'numeric', 'O'),
      f('software_house', 'Software House', 30, 'alphanum', 'O'),
      f('software_version', 'Software Version', 30, 'alphanum', 'O'),
    ],
  },
  GRH: {
    cls: 'simple', emitted: true, fields: [
      f('transaction_type', 'Transaction Type', 3, 'lookup', 'M', 'transaction_type'),
      f('group_id', 'Group ID', 5, 'numeric', 'M'),
      f('version_number', 'Version Number', 5, 'lookup', 'M'),
      f('batch_request', 'Batch Request', 10, 'blank', 'O'),
      f('reserved', 'Reserved', 2, 'blank', 'O'),
    ],
  },
  GRT: {
    cls: 'simple', emitted: true, fields: [
      f('group_id', 'Group ID', 5, 'numeric', 'M'),
      f('transaction_count', 'Transaction Count', 8, 'numeric', 'M'),
      f('record_count', 'Record Count', 8, 'numeric', 'M'),
    ],
  },
  TRL: {
    cls: 'simple', emitted: true, fields: [
      f('group_count', 'Group Count', 5, 'numeric', 'M'),
      f('transaction_count', 'Transaction Count', 8, 'numeric', 'M'),
      f('record_count', 'Record Count', 8, 'numeric', 'M'),
    ],
  },
  NWR: {
    cls: 'transaction', emitted: true, fields: [
      f('work_title', 'Work Title', 60, 'alphanum_ext', 'M'),
      f('language_code', 'Language Code', 2, 'alphanum', 'O', 'language_code'),
      f('submitter_work_n', 'Submitter Work #', 14, 'alphanum', 'M'),
      f('iswc', 'ISWC', 11, 'iswc', 'O'),
      f('copyright_date', 'Copyright Date', 8, 'date', 'O'),
      f('copyright_number', 'Copyright Number', 12, 'alphanum', 'O'),
      f('musical_work_distribution_category', 'Distribution Category', 3, 'lookup', 'M', 'musical_work_distribution_category'),
      f('duration', 'Duration', 6, 'time', 'O'),
      f('recorded_indicator', 'Recorded Indicator', 1, 'flag', 'M'),
      f('text_music_relationship', 'Text-Music Relationship', 3, 'lookup', 'O', 'text_music_relationship'),
      f('composite_type', 'Composite Type', 3, 'lookup', 'O', 'composite_type'),
      f('version_type', 'Version Type', 3, 'lookup', 'M', 'version_type'),
      f('excerpt_type', 'Excerpt Type', 3, 'lookup', 'O', 'excerpt_type'),
      f('music_arrangement', 'Music Arrangement', 3, 'lookup', 'O', 'music_arrangement'),
      f('lyric_adaptation', 'Lyric Adaptation', 3, 'lookup', 'O', 'lyric_adaptation'),
      f('contact_name', 'Contact Name', 30, 'alphanum', 'O'),
      f('contact_id', 'Contact ID', 10, 'alphanum', 'O'),
      f('work_type', 'Work Type', 2, 'lookup', 'O', 'work_type'),
      f('grand_rights_indicator', 'Grand Rights Indicator', 1, 'boolean', 'O'),
      f('composite_component_count', 'Composite Component Count', 3, 'numeric', 'O'),
    ],
  },
  ALT: {
    cls: 'transaction', emitted: true, fields: [
      f('alternate_title', 'Alternate Title', 60, 'alphanum_ext', 'M'),
      f('title_type', 'Title Type', 2, 'lookup', 'M', 'title_type'),
      f('language_code', 'Language Code', 2, 'alphanum', 'O', 'language_code'),
    ],
  },
  SPU: {
    cls: 'transaction', emitted: true, fields: [
      f('publisher_sequence_n', 'Publisher Sequence #', 2, 'numeric', 'M'),
      f('ip_n', 'Interested Party #', 9, 'alphanum', 'M'),
      f('publisher_name', 'Publisher Name', 45, 'alphanum', 'C'),
      f('publisher_unknown', 'Publisher Unknown', 1, 'flag', 'C'),
      f('publisher_type', 'Publisher Type', 2, 'lookup', 'C', 'publisher_type'),
      f('tax_id', 'Tax ID', 9, 'numeric', 'O'),
      f('ipi_name_n', 'IPI Name #', 11, 'ipi_name_n', 'O'),
      f('submitter_agreement_n', 'Submitter Agreement #', 14, 'alphanum', 'O'),
      f('pr_society', 'PR Society', 3, 'lookup_int', 'O', 'society_code'),
      f('pr_ownership_share', 'PR Ownership Share', 5, 'percentage', 'M'),
      f('mr_society', 'MR Society', 3, 'lookup_int', 'O', 'society_code'),
      f('mr_ownership_share', 'MR Ownership Share', 5, 'percentage', 'M'),
      f('sr_society', 'SR Society', 3, 'lookup_int', 'O', 'society_code'),
      f('sr_ownership_share', 'SR Ownership Share', 5, 'percentage', 'M'),
      f('special_agreements', 'Special Agreements', 1, 'lookup', 'O', 'special_agreement_indicator'),
      f('first_recording_refusal', 'First Recording Refusal', 1, 'flag', 'O'),
      f('filler', 'Filler', 1, 'blank', 'O'),
      f('ipi_base_n', 'IPI Base #', 13, 'ipi_base_n', 'O'),
      f('international_standard_code', 'International Standard Agreement Code', 14, 'alphanum', 'O'),
      f('society_assigned_agreement_n', 'Society-Assigned Agreement #', 14, 'alphanum', 'O'),
      f('agreement_type', 'Agreement Type', 2, 'lookup', 'O', 'agreement_type'),
      f('usa_license', 'USA License', 1, 'lookup', 'O', 'usa_license_indicator'),
    ],
  },
  SPT: {
    cls: 'transaction', emitted: true, fields: [
      f('ip_n', 'Interested Party #', 9, 'alphanum', 'M'),
      f('constant', 'Constant', 6, 'blank', 'M'),
      f('pr_collection_share', 'PR Collection Share', 5, 'percentage', 'M'),
      f('mr_collection_share', 'MR Collection Share', 5, 'percentage', 'M'),
      f('sr_collection_share', 'SR Collection Share', 5, 'percentage', 'M'),
      f('inclusion_exclusion_indicator', 'Inclusion/Exclusion Indicator', 1, 'lookup', 'M', 'inclusion_exclusion_indicator'),
      f('tis_numeric_code', 'TIS Numeric Code', 4, 'lookup_int', 'M', 'tis_code'),
      f('shares_change', 'Shares Change', 1, 'boolean', 'O'),
      f('sequence_n', 'Sequence #', 3, 'numeric', 'M'),
    ],
  },
  SWR: {
    cls: 'transaction', emitted: true, fields: [
      f('ip_n', 'Interested Party #', 9, 'alphanum', 'M'),
      f('writer_last_name', 'Writer Last Name', 45, 'alphanum', 'M'),
      f('writer_first_name', 'Writer First Name', 30, 'alphanum', 'O'),
      f('writer_unknown', 'Writer Unknown', 1, 'flag', 'C'),
      f('writer_designation', 'Writer Designation', 2, 'lookup', 'C', 'writer_designation_code'),
      f('tax_id', 'Tax ID', 9, 'numeric', 'O'),
      f('ipi_name_n', 'IPI Name #', 11, 'ipi_name_n', 'O'),
      f('pr_society', 'PR Society', 3, 'lookup_int', 'O', 'society_code'),
      f('pr_ownership_share', 'PR Ownership Share', 5, 'percentage', 'M'),
      f('mr_society', 'MR Society', 3, 'lookup_int', 'O', 'society_code'),
      f('mr_ownership_share', 'MR Ownership Share', 5, 'percentage', 'M'),
      f('sr_society', 'SR Society', 3, 'lookup_int', 'O', 'society_code'),
      f('sr_ownership_share', 'SR Ownership Share', 5, 'percentage', 'M'),
      f('reversionary', 'Reversionary', 1, 'flag', 'O'),
      f('first_recording_refusal', 'First Recording Refusal', 1, 'flag', 'O'),
      f('work_for_hire', 'Work For Hire', 1, 'flag', 'O'),
      f('filler', 'Filler', 1, 'blank', 'O'),
      f('ipi_base_n', 'IPI Base #', 13, 'ipi_base_n', 'O'),
      f('personal_number', 'Personal Number', 12, 'numeric', 'O'),
      f('usa_license', 'USA License', 1, 'lookup', 'O', 'usa_license_indicator'),
    ],
  },
  SWT: {
    cls: 'transaction', emitted: true, fields: [
      f('ip_n', 'Interested Party #', 9, 'alphanum', 'M'),
      f('pr_collection_share', 'PR Collection Share', 5, 'percentage', 'M'),
      f('mr_collection_share', 'MR Collection Share', 5, 'percentage', 'M'),
      f('sr_collection_share', 'SR Collection Share', 5, 'percentage', 'M'),
      f('inclusion_exclusion_indicator', 'Inclusion/Exclusion Indicator', 1, 'lookup', 'M', 'inclusion_exclusion_indicator'),
      f('tis_numeric_code', 'TIS Numeric Code', 4, 'lookup_int', 'M', 'tis_code'),
      f('shares_change', 'Shares Change', 1, 'boolean', 'O'),
      f('sequence_n', 'Sequence #', 3, 'numeric', 'M'),
    ],
  },
  PWR: {
    cls: 'transaction', emitted: true, fields: [
      f('publisher_ip_n', 'Publisher IP #', 9, 'alphanum', 'M'),
      f('publisher_name', 'Publisher Name', 45, 'alphanum', 'C'),
      f('submitter_agreement_n', 'Submitter Agreement #', 14, 'alphanum', 'O'),
      f('society_assigned_agreement_n', 'Society-Assigned Agreement #', 14, 'alphanum', 'O'),
      f('writer_ip_n', 'Writer IP #', 9, 'alphanum', 'M'),
      f('publisher_sequence_n', 'Publisher Sequence #', 2, 'numeric', 'M'),
    ],
  },
  REC: {
    cls: 'transaction', emitted: true, fields: [
      f('first_release_date', 'First Release Date', 8, 'date', 'O'),
      f('constant_1', 'Constant', 60, 'blank', 'O'),
      f('first_release_duration', 'First Release Duration', 6, 'time', 'O'),
      f('constant_2', 'Constant', 5, 'blank', 'O'),
      f('first_album_title', 'First Album Title', 60, 'alphanum_ext', 'O'),
      f('first_album_label', 'First Album Label', 60, 'alphanum', 'O'),
      f('first_release_catalog_n', 'First Release Catalog #', 18, 'alphanum', 'O'),
      f('ean13', 'EAN-13', 13, 'ean13', 'O'),
      f('isrc', 'ISRC', 12, 'isrc', 'O'),
      f('recording_format', 'Recording Format', 1, 'lookup', 'O', 'recording_format'),
      f('recording_technique', 'Recording Technique', 1, 'lookup', 'O', 'recording_technique'),
      f('media_type', 'Media Type', 3, 'lookup', 'O', 'media_type'),
      f('recording_title', 'Recording Title', 60, 'alphanum_ext', 'O'),
      f('version_title', 'Version Title', 60, 'alphanum_ext', 'O'),
      f('display_artist', 'Display Artist', 60, 'alphanum_ext', 'O'),
      f('record_label', 'Record Label', 60, 'alphanum', 'O'),
      f('isrc_validity', 'ISRC Validity', 20, 'flag', 'C'),
      f('submitter_recording_identifier', 'Submitter Recording Identifier', 14, 'alphanum', 'O'),
    ],
  },
};

// O* twins share their controlled counterpart's layout.
const TWINS: Record<string, string> = { OPU: 'SPU', OPT: 'SPT', OWR: 'SWR', OWT: 'SWT', REV: 'NWR', ISW: 'NWR', EXC: 'NWR' };

/** Assemble a record's FieldSpec[] with computed byte offsets (prefix prepended). */
function assemble(decl: RecordDecl): FieldSpec[] {
  const all = [...(decl.cls === 'simple' ? SIMPLE_PREFIX : TX_PREFIX), ...decl.fields];
  const specs: FieldSpec[] = [];
  let start = 0;
  for (const [key, name, len, datatype, presence = 'O', source] of all) {
    specs.push({ key, name, start, len, datatype, presence, ...(source ? { source } : {}) });
    start += len;
  }
  return specs;
}

const GRAMMAR: Record<string, FieldSpec[]> = Object.fromEntries(
  Object.entries(DECLS).map(([head, decl]) => [head, assemble(decl)]),
);

// ── Records we validate but do not generate (P10) ─────────────────────────────────────────────────
// Each is an ordered list of field keys resolved through FIELD_DEFS; all are transaction records and
// all fit the ASCII record set we validate. Non-roman/unicode records are excluded (see field-defs.ts).
const CONFIG_RECORDS: Record<string, string[]> = {
  ACK: ['creation_date_time', 'original_group_id', 'original_transaction_sequence_n', 'original_transaction_type', 'creation_title', 'submitter_creation_n', 'recipient_creation_n', 'processing_date', 'transaction_status'],
  AGR: ['submitter_agreement_n', 'international_standard_code', 'agreement_type', 'agreement_start_date', 'agreement_end_date', 'retention_end_date', 'prior_royalty_status', 'prior_royalty_start_date', 'post_term_collection_status', 'post_term_collection_end_date', 'date_of_signature', 'number_of_works', 'sales_manufacture_clause', 'shares_change', 'advance_given', 'society_assigned_agreement_n'],
  ARI: ['society_n', 'work_n', 'type_of_right', 'subject_code', 'note'],
  COM: ['component_title', 'iswc', 'submitter_work_n', 'component_duration', 'writer_1_last_name', 'writer_1_first_name', 'writer_1_ipi_name_n', 'writer_2_last_name', 'writer_2_first_name', 'writer_2_ipi_name_n', 'writer_1_ipi_base_n', 'writer_2_ipi_base_n'],
  EWT: ['entire_work_title', 'iswc', 'language_code', 'writer_1_last_name', 'writer_1_first_name', 'source', 'writer_1_ipi_name_n', 'writer_1_ipi_base_n', 'writer_2_last_name', 'writer_2_first_name', 'writer_2_ipi_name_n', 'writer_2_ipi_base_n', 'submitter_work_n'],
  VER: ['original_title', 'iswc', 'language_code', 'writer_1_last_name', 'writer_1_first_name', 'source', 'writer_1_ipi_name_n', 'writer_1_ipi_base_n', 'writer_2_last_name', 'writer_2_first_name', 'writer_2_ipi_name_n', 'writer_2_ipi_base_n', 'submitter_work_n'],
  IND: ['instrument_code', 'number_players'],
  INS: ['number_voices', 'standard_instrumentation_type', 'instrumentation_description'],
  IPA: ['agreement_role_code', 'ipi_name_n', 'ipi_base_n', 'ip_n', 'ip_last_name', 'ip_writer_first_name', 'pr_society', 'pr_share', 'mr_society', 'mr_share', 'sr_society', 'sr_share'],
  PER: ['performing_artist_last_name', 'performing_artist_first_name', 'performing_artist_ipi_name_n', 'performing_artist_ipi_base_n'],
  ORN: ['intended_purpose', 'production_title', 'cd_identifier', 'cut_number', 'library', 'bltvr', 'visan', 'production_n', 'episode_title', 'episode_n', 'year_production', 'audio_visual_key'],
  TER: ['inclusion_exclusion_indicator', 'tis_numeric_code'],
  MSG: ['message_type', 'original_record_sequence_n', 'message_record_type', 'message_level', 'validation_n', 'message_text'],
};

function assembleConfig(fieldKeys: string[]): FieldSpec[] {
  const decl: RecordDecl = {
    cls: 'transaction',
    emitted: false,
    fields: fieldKeys.map((key): FieldDecl => {
      const d = FIELD_DEFS[key];
      if (!d) throw new Error(`CWR grammar: no field def for "${key}"`);
      return [key, d.name, d.len, d.datatype, 'O', d.source];
    }),
  };
  return assemble(decl);
}

const CONFIG_GRAMMAR: Record<string, FieldSpec[]> = Object.fromEntries(
  Object.entries(CONFIG_RECORDS).map(([head, keys]) => [head, assembleConfig(keys)]),
);

/** Heads our generator emits (byte-verified by the consistency test), incl. their O* twins. */
export const EMITTED_HEADS: string[] = [
  ...Object.entries(DECLS).filter(([, d]) => d.emitted).map(([h]) => h),
  ...Object.entries(TWINS).filter(([, base]) => DECLS[base]?.emitted).map(([h]) => h),
];

/** All heads the grammar knows (emitted + twins + config-only records). */
export const RECORD_HEADS: string[] = [...Object.keys(GRAMMAR), ...Object.keys(TWINS), ...Object.keys(CONFIG_GRAMMAR)];

/** FieldSpec[] for a record head, or null if the head is unknown to the grammar. */
export function getGrammar(head: string): FieldSpec[] | null {
  return GRAMMAR[head] ?? GRAMMAR[TWINS[head]] ?? CONFIG_GRAMMAR[head] ?? null;
}
