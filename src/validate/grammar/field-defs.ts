// Field definitions for CWR record types we VALIDATE but do not generate (AGR/TER/IPA/COM/EWT/VER/PER/
// ORN/INS/IND/ARI/ACK/MSG). Transcribed from the MIT weso/CWR-DataApi field config (size + datatype +
// lookup `source`). The grammar assembler turns a record's ordered field-key list into FieldSpec[] with
// computed byte offsets — so adding a record type is data entry, not new code.
//
// Non-roman/unicode records (NPN/NPA/NWN/NOW/NPR/NAT) are intentionally absent because they never
// appear in the ASCII files we send to a society. They need separate parser and grammar support.

import type { CwrDatatype } from './record-grammar';

export interface FieldDef {
  name: string;
  len: number;
  datatype: CwrDatatype;
  source?: string;
}

export const FIELD_DEFS: Record<string, FieldDef> = {
  // identifiers & parties
  ip_n: { name: 'Interested Party #', len: 9, datatype: 'alphanum' },
  ip_last_name: { name: 'Interested Party Last Name', len: 45, datatype: 'alphanum' },
  ip_writer_first_name: { name: 'Interested Party Writer First Name', len: 30, datatype: 'alphanum' },
  ipi_name_n: { name: 'IPI Name #', len: 11, datatype: 'ipi_name_n' },
  ipi_base_n: { name: 'IPI Base #', len: 13, datatype: 'ipi_base_n' },
  iswc: { name: 'ISWC', len: 11, datatype: 'iswc' },
  submitter_work_n: { name: 'Submitter Work #', len: 14, datatype: 'alphanum' },
  work_n: { name: 'Work #', len: 14, datatype: 'alphanum' },

  // shares & societies
  pr_society: { name: 'PR Society', len: 3, datatype: 'lookup_int', source: 'society_code' },
  mr_society: { name: 'MR Society', len: 3, datatype: 'lookup_int', source: 'society_code' },
  sr_society: { name: 'SR Society', len: 3, datatype: 'lookup_int', source: 'society_code' },
  society_n: { name: 'Society #', len: 3, datatype: 'lookup_int', source: 'society_code' },
  pr_share: { name: 'PR Share', len: 5, datatype: 'percentage' },
  mr_share: { name: 'MR Share', len: 5, datatype: 'percentage' },
  sr_share: { name: 'SR Share', len: 5, datatype: 'percentage' },

  // agreement (AGR)
  submitter_agreement_n: { name: 'Submitter Agreement #', len: 14, datatype: 'alphanum' },
  international_standard_code: { name: 'International Standard Agreement Code', len: 14, datatype: 'alphanum' },
  society_assigned_agreement_n: { name: 'Society-Assigned Agreement #', len: 14, datatype: 'alphanum' },
  agreement_type: { name: 'Agreement Type', len: 2, datatype: 'lookup', source: 'agreement_type' },
  agreement_role_code: { name: 'Agreement Role Code', len: 2, datatype: 'lookup', source: 'agreement_role_code' },
  agreement_start_date: { name: 'Agreement Start Date', len: 8, datatype: 'date' },
  agreement_end_date: { name: 'Agreement End Date', len: 8, datatype: 'date' },
  retention_end_date: { name: 'Retention End Date', len: 8, datatype: 'date' },
  prior_royalty_status: { name: 'Prior Royalty Status', len: 1, datatype: 'lookup', source: 'prior_royalty_status' },
  prior_royalty_start_date: { name: 'Prior Royalty Start Date', len: 8, datatype: 'date' },
  post_term_collection_status: { name: 'Post-Term Collection Status', len: 1, datatype: 'lookup', source: 'post_term_collection_status' },
  post_term_collection_end_date: { name: 'Post-Term Collection End Date', len: 8, datatype: 'date' },
  date_of_signature: { name: 'Date of Signature', len: 8, datatype: 'date' },
  number_of_works: { name: 'Number of Works', len: 5, datatype: 'numeric' },
  sales_manufacture_clause: { name: 'Sales/Manufacture Clause', len: 1, datatype: 'lookup', source: 'sales_manufacture_clause' },
  shares_change: { name: 'Shares Change', len: 1, datatype: 'boolean' },
  advance_given: { name: 'Advance Given', len: 1, datatype: 'boolean' },

  // territory (TER)
  inclusion_exclusion_indicator: { name: 'Inclusion/Exclusion Indicator', len: 1, datatype: 'lookup', source: 'inclusion_exclusion_indicator' },
  tis_numeric_code: { name: 'TIS Numeric Code', len: 4, datatype: 'lookup_int', source: 'tis_code' },

  // component / cross-title (COM/EWT/VER)
  component_title: { name: 'Component Title', len: 60, datatype: 'alphanum' },
  component_duration: { name: 'Duration', len: 8, datatype: 'time' },
  entire_work_title: { name: 'Entire Work Title', len: 60, datatype: 'alphanum' },
  original_title: { name: 'Original Work Title', len: 60, datatype: 'alphanum' },
  language_code: { name: 'Language Code', len: 2, datatype: 'alphanum', source: 'language_code' },
  source: { name: 'Source', len: 60, datatype: 'alphanum' },
  writer_1_last_name: { name: 'Writer 1 Last Name', len: 45, datatype: 'alphanum' },
  writer_1_first_name: { name: 'Writer 1 First Name', len: 30, datatype: 'alphanum' },
  writer_1_ipi_name_n: { name: 'Writer 1 IPI Name #', len: 11, datatype: 'ipi_name_n' },
  writer_1_ipi_base_n: { name: 'Writer 1 IPI Base #', len: 13, datatype: 'ipi_base_n' },
  writer_2_last_name: { name: 'Writer 2 Last Name', len: 45, datatype: 'alphanum' },
  writer_2_first_name: { name: 'Writer 2 First Name', len: 30, datatype: 'alphanum' },
  writer_2_ipi_name_n: { name: 'Writer 2 IPI Name #', len: 11, datatype: 'ipi_name_n' },
  writer_2_ipi_base_n: { name: 'Writer 2 IPI Base #', len: 13, datatype: 'ipi_base_n' },

  // instrumentation (INS/IND)
  instrument_code: { name: 'Instrument', len: 3, datatype: 'lookup', source: 'instrument_code' },
  number_players: { name: 'Number of Players', len: 3, datatype: 'numeric' },
  number_voices: { name: 'Number of Voices', len: 3, datatype: 'numeric' },
  standard_instrumentation_type: { name: 'Standard Instrumentation Type', len: 3, datatype: 'lookup', source: 'standard_instrumentation_type' },
  instrumentation_description: { name: 'Instrumentation Description', len: 50, datatype: 'alphanum' },

  // additional related info (ARI)
  type_of_right: { name: 'Type of Right', len: 3, datatype: 'lookup', source: 'type_of_right' },
  subject_code: { name: 'Subject Code', len: 2, datatype: 'lookup', source: 'subject_code' },
  note: { name: 'Note', len: 160, datatype: 'alphanum' },

  // performing artist (PER)
  performing_artist_last_name: { name: 'Performing Artist Last Name', len: 45, datatype: 'alphanum' },
  performing_artist_first_name: { name: 'Performing Artist First Name', len: 30, datatype: 'alphanum' },
  performing_artist_ipi_name_n: { name: 'Performing Artist IPI Name #', len: 11, datatype: 'ipi_name_n' },
  performing_artist_ipi_base_n: { name: 'Performing Artist IPI Base #', len: 13, datatype: 'ipi_base_n' },

  // work origin (ORN)
  intended_purpose: { name: 'Intended Purpose', len: 3, datatype: 'lookup', source: 'intended_purpose' },
  production_title: { name: 'Production Title', len: 60, datatype: 'alphanum' },
  cd_identifier: { name: 'CD Identifier', len: 15, datatype: 'alphanum' },
  cut_number: { name: 'Cut Number', len: 4, datatype: 'numeric' },
  library: { name: 'Library', len: 60, datatype: 'alphanum' },
  bltvr: { name: 'BLTVR', len: 1, datatype: 'alphanum' },
  visan: { name: 'VISAN', len: 25, datatype: 'alphanum' },
  production_n: { name: 'Production #', len: 12, datatype: 'alphanum' },
  episode_title: { name: 'Episode Title', len: 60, datatype: 'alphanum' },
  episode_n: { name: 'Episode #', len: 20, datatype: 'alphanum' },
  year_production: { name: 'Year of Production', len: 4, datatype: 'numeric' },
  audio_visual_key: { name: 'AVI Field', len: 18, datatype: 'alphanum' },

  // acknowledgement (ACK)
  creation_date_time: { name: 'Creation Date and Time', len: 16, datatype: 'alphanum' },
  original_group_id: { name: 'Original Group ID', len: 5, datatype: 'numeric' },
  original_transaction_sequence_n: { name: 'Original Transaction Sequence #', len: 8, datatype: 'numeric' },
  original_transaction_type: { name: 'Original Transaction Type', len: 3, datatype: 'lookup', source: 'transaction_type' },
  creation_title: { name: 'Creation Title', len: 60, datatype: 'alphanum' },
  submitter_creation_n: { name: 'Submitter Creation #', len: 20, datatype: 'alphanum' },
  recipient_creation_n: { name: 'Recipient Creation #', len: 20, datatype: 'alphanum' },
  processing_date: { name: 'Processing Date', len: 8, datatype: 'date' },
  transaction_status: { name: 'Transaction Status', len: 2, datatype: 'lookup', source: 'transaction_status' },

  // message (MSG)
  message_type: { name: 'Message Type', len: 1, datatype: 'lookup', source: 'message_type' },
  original_record_sequence_n: { name: 'Original Record Sequence #', len: 8, datatype: 'numeric' },
  message_record_type: { name: 'Message Record Type', len: 3, datatype: 'lookup', source: 'record_type' },
  message_level: { name: 'Message Level', len: 1, datatype: 'lookup', source: 'message_level' },
  validation_n: { name: 'Validation #', len: 3, datatype: 'numeric' },
  message_text: { name: 'Message Text', len: 150, datatype: 'alphanum' },
};
