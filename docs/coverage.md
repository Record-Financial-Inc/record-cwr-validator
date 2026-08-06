# CWR19-1070 coverage: rule by rule

Every validation rule governing a work registration, mapped to the engine rule that
implements it or to the reason it cannot be. Generated from the specification text and a
checked map: the generator fails if a rule is unmapped or a mapping names a rule that does
not exist, so this cannot drift from the source or quietly omit anything.

| | Rules | |
|---|---:|---|
| **Covered** | **201** | of 219 |
| Implementable, not implemented | 0 | listed below |
| Needs reference data that cannot be distributed | 15 | reports as unverifiable, never as a pass |
| Asks about submission history, not this file | 3 | belongs to the system tracking submissions |

**201 of 201 reachable rules** are implemented. 18 rules cannot be evaluated from a file at all, so 219 of 219 was never attainable.

Severities are the specification's: **ER** entire file, **GR** group, **TR** transaction,
**RR** record, **FR** field rejected.

## Implementable gaps

| Rule | Sev | Requirement | Why open |
|---|---|---|---|

## Not evaluable from a file

| Rule | Sev | Needs |
|---|---|---|
| HDR field 6 | ER | Society Code Table names (the shipped table holds codes only) |
| HDR field 8 | ER | Publisher Code Table |
| NWR/REV/ISW/EXC trans 2 | FR | submission history |
| NWR/REV/ISW/EXC trans 13 | TR | submission history |
| SPU/OPU recor 4 | TR | agreement records (right to administer) |
| SPU/OPU field 10 | FR | IPI database |
| SPU/OPU field 11 | FR | society agreement register |
| SPU/OPU field 24 | FR | IPI database |
| SPU/OPU field 25 | FR | international agreements database |
| SPU/OPU field 26 | FR | society agreement register |
| SPU/OPU field 29 | TR | Society Code Table names (the shipped table holds codes only) |
| SWR/OWR field 9 | FR | IPI database |
| SWR/OWR field 22 | FR | IPI database |
| PWR field 3 | FR | society agreement register |
| PWR field 4 | FR | society agreement register |
| PER field 2 | FR | IPI database |
| PER field 3 | FR | IPI database |
| REC field 19 | RR | submission history |

## Full map

### Record prefix (§2.1): 9/9 covered

| Rule | Sev | Requirement | Implemented by |
|---|---|---|---|
| field 1 | ER | Record Type must be either a valid transaction type or a valid detail record type. | `RECORD_PREFIX` |
| field 2 | ER | If this is the first transaction header in the group, Transaction Sequence # must be equ | `TX_SEQUENCE` |
| field 3 | TR | If this is a transaction header that is not the first transaction header in the group, t | `TX_SEQUENCE` |
| field 4 | TR | If this is a detail record, the Transaction Sequence # must be equal to the previous rec | `RECORD_PREFIX` |
| field 5 | ER | If this is a transaction header record, the Record Sequence # must be equal to zero. | `RECORD_SEQUENCE` |
| field 6 | ER | If this is a detail record, the Record Sequence # must be equal to the previous record’s | `RECORD_SEQUENCE` |
| field 7 | ER | If the Transaction Sequence # on subsequent transactions are not in sequential order wit | `TX_SEQUENCE` |
| field 8 | ER | If any detail records belonging to a transaction header do not carry the same Transactio | `RECORD_PREFIX` |
| field 9 | ER | Record length must match the record length specified within the specification. (ER) [1]  | `RECORD_PREFIX` |

### File level (§3.4): 10/10 covered

| Rule | Sev | Requirement | Implemented by |
|---|---|---|---|
| field 1 | ER | If the file cannot be read, the entire file will be rejected. | `FRAMING` |
| field 2 | ER | If the first record on the file is not record type HDR, the entire file will be rejected | `FRAMING` |
| field 3 | ER | If the second record on the file is not record type GRH, the entire file will be rejecte | `FRAMING` |
| field 4 | ER | If every subsequent GRH on the file is not preceded by a GRT, the entire file will be re | `ENVELOPE_CONSTANTS` |
| field 5 | ER | If the last record on the file is not record type TRL, the entire file will be rejected. | `FRAMING` |
| field 6 | ER | If record type GRH is not followed by a transaction header record type, the entire file  | `ENVELOPE_CONSTANTS` |
| field 7 | ER | If record type GRT is not followed by a record type GRH or TRL, the entire file will be  | `ENVELOPE_CONSTANTS` |
| field 8 | ER | If the file contains more than one record type HDR or TRL, the entire file will be rejec | `ENVELOPE_CONSTANTS` |
| field 9 | ER | If the header (HDR) contains an invalid version number the entire file will be rejected | `ENVELOPE_CONSTANTS` |
| field 10 | ER | If the header (HDR) contains a invalid revision number the entire file will be rejected | `ENVELOPE_CONSTANTS` |

### Transmission header (§3.5): 14/16 covered

| Rule | Sev | Requirement | Implemented by |
|---|---|---|---|
| field 1 | ER | Record Type must be equal to HDR. | `FRAMING` |
| field 2 | ER | Sender Type must be equal to PB (publisher), SO (society), WR (writer), or AA (administr | `SENDER_REGISTERED` |
| field 3 | ER | If Sender Type is equal to PB, WR, or AA, Sender ID must be entered and must match the a | `SENDER_REGISTERED` |
| field 4 | ER | If Sender Type is equal to SO, Sender ID must be entered and must match an entry in the  | `SENDER_REGISTERED` |
| field 5 | ER | If Sender Type is equal to PB, Sender Name must match the name on the corresponding entr | `SENDER_REGISTERED` |
| field 6 | ER | If Sender Type is equal to SO, Sender Name must match the name on the corresponding entr | _not evaluable_ |
| field 7 | ER | If Sender Type is equal to AA, Sender ID must contain the IPI# of the Publisher that the | `SENDER_REGISTERED` |
| field 8 | ER | If Sender Type is equal to AA, Sender Name must match the name on the corresponding entr | _not evaluable_ |
| field 9 | ER | EDI Standard Version Number must be equal to the constant value “01.10”. | `ENVELOPE_CONSTANTS` |
| field 10 | ER | Creation Date must be a valid date. | `ENVELOPE_FIELD` |
| field 11 | ER | Transmission Date must be a valid date. | `ENVELOPE_FIELD` |
| field 12 | ER | If the Sender Type is PB, the Sender ID must be for an approved CWR participant. | `SENDER_REGISTERED` |
| field 13 | ER | If the Sender Type is equal to WR, Sender ID must be a valid IPI # for a writer. | `SENDER_REGISTERED` |
| field 14 | ER | If entered, the Character Set must be one of Traditional [Big5] or Simplified [GB] or a  | `ENVELOPE_FIELD` |
| field 15 | ER | Version if entered and must be 2.2 | `ENVELOPE_CONSTANTS` |
| field 16 | ER | Revision number if entered must be a valid CWR version 2.2 revision number from the vers | `ENVELOPE_CONSTANTS` |

### Group header (§3.6): 5/5 covered

| Rule | Sev | Requirement | Implemented by |
|---|---|---|---|
| field 1 | GR | Transaction Type must be entered and must match an entry in the Transaction Type table. | `ENVELOPE_FIELD` |
| field 2 | GR | Group ID must be entered, must start at 1, and must increment by 1 sequentially for each | `ENVELOPE_CONSTANTS` |
| field 3 | ER | GRH records must follow either a GRT record or an HDR record. | `ENVELOPE_CONSTANTS` |
| field 4 | GR | For use of the CWR version 2 as described in this document, the Version Number must be ' | `ENVELOPE_CONSTANTS` |
| field 5 | GR | Each Group Transaction type can only be used once per file. | `ENVELOPE_CONSTANTS` |

### Group trailer (§3.7): 4/4 covered

| Rule | Sev | Requirement | Implemented by |
|---|---|---|---|
| field 1 | GR | Group ID must be equal to the Group ID presented on the previous GRH record. | `ENVELOPE_CONSTANTS` |
| field 2 | GR | Transaction count must be equal to the total number of transactions within this group. | `TRAILER_COUNTS` |
| field 3 | GR | Record count must be equal to the total number of physical records inclusive of the GRH  | `TRAILER_COUNTS` |
| field 4 | GR | Currency Indicator is mandatory if Total Monetary Value is provided | `ENVELOPE_CONSTANTS` |

### Transmission trailer (§3.8): 3/3 covered

| Rule | Sev | Requirement | Implemented by |
|---|---|---|---|
| field 1 | ER | Group Count must be equal to the number of groups within the entire file. | `TRAILER_COUNTS` |
| field 2 | ER | Transaction count must be equal to the number of transactions within the entire file. | `TRAILER_COUNTS` |
| field 3 | ER | Record count must be equal to the number of physical records inclusive of the HDR and TR | `TRAILER_COUNTS` |

### Work registration (§4.2): 46/48 covered

| Rule | Sev | Requirement | Implemented by |
|---|---|---|---|
| field 1 | TR | Work Title must be entered. | `MANDATORY_FIELD` |
| field 2 | TR | Language Code, if entered, must match an entry in the Language Code Table. | `LOOKUP_CODE` |
| field 3 | TR | Submitter Work Number must be entered and must be unique for the party submitting the fi | `MANDATORY_FIELD` |
| field 4 | FR | If ISWC is entered, it must be a valid ISWC. | `CHECK_DIGIT` |
| field 5 | FR | Copyright Date must be a valid date. | `FIELD_FORMAT` |
| field 6 | TR | Musical Work Distribution Category must be entered and it must match an entry in the Mus | `LOOKUP_CODE` |
| field 7 | TR | If Musical Work Distribution Category is equal to “SER”, Duration must be greater than z | `CONDITIONAL_FIELDS` |
| field 8 | FR | If Music Work Distribution Category is not equal to “SER”, and Duration is entered, it m | `FIELD_FORMAT` |
| field 9 | FR | Recorded Indicator must be equal to “Y”, “N”, or “U”. | `FIELD_FORMAT` |
| field 10 | FR | If Text Music Relationship is entered, it must match an entry in the Text Music Relation | `LOOKUP_CODE` |
| field 11 | FR | If Composite Type is entered, it must match an entry on the Composite Type table. | `LOOKUP_CODE` |
| field 12 | TR | Version Type must be entered and must match an entry on the Version Type table. | `LOOKUP_CODE` |
| field 13 | FR | If Excerpt Type is entered, it must match an entry on the Excerpt Type table. | `LOOKUP_CODE` |
| field 14 | TR | If Version Type is equal to “MOD”, Music Arrangement must be entered and must match an e | `CONDITIONAL_FIELDS` |
| field 15 | TR | If Version Type is equal to “MOD”, Lyric Adaptation must be entered and must match an en | `CONDITIONAL_FIELDS` |
| field 16 | FR | If entered, Grand Rights Ind. must be equal to “Y” or “N”. | `FIELD_FORMAT` |
| field 17 | FR | When entered, CWR Work Type must match an entry in the CWR Work Type table. | `LOOKUP_CODE` |
| field 18 | TR | If Composite Type is entered, Composite Component Count must be entered. | `CONDITIONAL_FIELDS` |
| field 19 | TR | If Composite Component Count is entered, Composite Type must be entered. | `CONDITIONAL_FIELDS` |
| field 20 | TR | If entered, Composite Component Count must be numeric and must be greater than 1. | `CONDITIONAL_FIELDS` |
| field 22 | TR | If entered, Music Arrangement must match an entry in the Music Arrangement table. | `LOOKUP_CODE` |
| field 23 | TR | If entered, Lyric Adaptation must match an entry in the Lyric Adaptation table | `LOOKUP_CODE` |
| field 24 | TR | Work Title must contain only valid ASCII characters from within the ‘Titles’ section of  | `CHARACTER_SET` |
| trans 1 | TR | Only one NWR or REV or ISW or EXC is allowed per transaction. | `REQUIRED_RECORDS` |
| trans 2 | FR | If Record Type is equal to REV and this work has not been successfully registered with t | _not evaluable_ |
| trans 4 | TR | Total Ownership shares across all SPU and OPU records must be less than or equal to 0500 | `TRANSACTION_SHARES` |
| trans 7 | TR | For each publisher controlled by the submitter that has collection shares, there must be | `PUBLISHER_TERRITORY_REQUIRED` |
| trans 8 | RR | Detail records other than those listed in the Transaction Format table may not be submit | `RECORD_ORDER` |
| trans 9 | TR | Total Ownership shares across all SWR and OWR records must be either 00000 (0%) or great | `TRANSACTION_SHARES` |
| trans 10 | TR | If Version Type is equal to “MOD”, at least one SWR or OWR record must contain a Writer  | `CONDITIONAL_FIELDS` |
| trans 11 | TR | The total ownership shares for all writers and publishers for each right must total eith | `OWNERSHIP_TOTAL` |
| trans 12 | TR | A transaction must contain at least one writer record, SWR, or OWR. | `WORK_WRITER_REQUIRED` |
| trans 13 | TR | If Record Type is "NWR", the work can not previously have been sent and accepted on a CW | _not evaluable_ |
| trans 14 | TR | The total of collection shares cannot exceed 100% for a given right for a territory. Not | `COLLECTION_TERRITORY` |
| trans 15 | TR | There must be at least one writer (Writer Designation Code = “CA”, “A”, “C”) in a work. | `TRANSACTION_SHARES` |
| trans 16 | TR | A non-controlled publisher (OPU) can not appear in a chain started with a controlled ori | `PARTY_CONSISTENCY` |
| trans 17 | TR | There can only be one original publisher (Publisher Type = “E”) in a publisher chain. | `TRANSACTION_SHARES` |
| trans 20 | TR | For each writer controlled by the submitter that has collection shares, there must be at | `WRITER_TERRITORY_REQUIRED` |
| trans 22 | GR | The Transaction Record Type (e.g. NWR or REV) must be the same as the Transaction Type o | `ENVELOPE_CONSTANTS` |
| trans 23 | TR | If Version Type is equal to “ORI”, there cannot be an SWR or OWR record that contains a  | `CONDITIONAL_FIELDS` |
| trans 24 | TR | If all writers (SWR/OWR) are in the public domain, then the total ownership shares for p | `APPENDIX_A_PERFORMANCE` |
| trans 25 | TR | For each SPU publisher chain (but not OPUs), the sum of at least one of PR Ownership Sha | `PARTY_CONSISTENCY` |
| trans 26 | TR | If an SPU record with publisher type “AQ” appears in a chain of title then the Ownership | `CONDITIONAL_RECORDS` |
| trans 27 | TR | For performing rights: Within each chain of title, the sum of Collection Shares for any  | `COLLECTION_TERRITORY` |
| trans 39 | TR | If CWR Work Type is equal to “FM”, the transaction must include an ORN (Work Origin) rec | `CONDITIONAL_RECORDS` |
| trans 43 | TR | The sequence of records within the transaction must be as follows: NWR/REV/ISW/EXC, SPU, | `RECORD_ORDER` |
| trans 44 | TR | For any territory and any right type the total controlled collection (SPT/SWT)and non-co | `COLLECTION_TERRITORY` |
| trans 53 | TR | If Musical Work Distribution Category is equal to ‘SER’, the transaction must include an | `CONDITIONAL_RECORDS` |

### Publishers (§5.4, §5.5): 30/37 covered

| Rule | Sev | Requirement | Implemented by |
|---|---|---|---|
| field 1 | TR | Publisher Sequence # must be entered. The first publisher chain on a work must have Publ | `MANDATORY_FIELD` |
| field 2 | TR | If Record Type is equal to SPU, Interested Party # must be entered. | `MANDATORY_FIELD` |
| field 3 | TR | Submitters must ensure that the Interested Party # is unique within their system for bot | `PARTY_IP_BIJECTION` |
| field 4 | TR | If Record Type is equal to SPU or Publisher Unknown Indicator is not equal to “Y”, Publi | `MANDATORY_FIELD` |
| field 5 | TR | If Record Type is equal to SPU, Publisher Type must be entered. | `MANDATORY_FIELD` |
| field 6 | TR | If Publisher Type is entered in an SPU record, it must match an entry in the Publisher T | `PUBLISHER_ROLE` |
| field 7 | TR | If Record Type is equal to SPU, Publisher Unknown Indicator must be blank. | `PARTY_CONSISTENCY` |
| field 8 | FR | If Record Type is equal to OPU and Publisher Unknown Indicator is entered, it must be eq | `LOOKUP_CODE` |
| field 9 | FR | If Record Type is equal to OPU and Publisher Unknown Indicator is equal to “Y”, Publishe | `PARTY_CONSISTENCY` |
| field 10 | FR | If Publisher IPI Name # is entered, it must match a publisher entry in the IPI database. | _not evaluable_ |
| field 11 | FR | If Submitter Agreement Number is entered, it must match the identifier for an agreement  | _not evaluable_ |
| field 12 | FR | If entered, PR Affiliation Society # must match an entry in the Society Code table. | `LOOKUP_CODE` |
| field 13 | TR | PR Ownership Share must be numeric. The value must also be between 00000 (0%) and 05000  | `FIELD_FORMAT` |
| field 15 | FR | If entered, MR Affiliation Society # must match an entry in the Society Code table | `LOOKUP_CODE` |
| field 16 | TR | MR Ownership Share must be numeric. The value must also be between 00000 (0%) and 10000  | `FIELD_FORMAT` |
| field 17 | FR | If entered, SR Affiliation Society # must match an entry in the Society Code table. | `LOOKUP_CODE` |
| field 18 | TR | SR Ownership Share must be numeric. The value must also be between 00000 (0%) and 10000  | `FIELD_FORMAT` |
| field 19 | TR | All ownership shares must be equal to 0 if Publisher Type is not equal to “E” or “AQ” (i | `PUBLISHER_CHAIN_ROLE` |
| field 20 | FR | If entered, Special Agreement Indicator must match an entry in the Special Agreement Ind | `LOOKUP_CODE` |
| field 21 | FR | If entered, First Recording Refusal Ind must be equal to Y or N. | `LOOKUP_CODE` |
| field 23 | FR | If entered, Tax ID must be numeric. | `FIELD_FORMAT` |
| field 24 | FR | If Publisher IPI Base Number is entered, it must match an entry in the IPI database. | _not evaluable_ |
| field 25 | FR | If International Standard Agreement Code is entered, it must match an entry in the inter | _not evaluable_ |
| field 26 | FR | If Society-Assigned Agreement Number is entered, it must match the identifier for an agr | _not evaluable_ |
| field 27 | FR | If Record Type is “OPU”, Special Agreements Indicator can only be “L” or blank. | `PARTY_CONSISTENCY` |
| field 28 | FR | If Record type is “OPU”, and Publisher type is invalid or missing, default to “E”. | `CONDITIONAL_RECORDS` |
| field 29 | TR | If the Publisher Name matches the name of a society in the Society Code table, and the P | _not evaluable_ |
| field 30 | FR | If Agreement Type is entered, it must match an entry in the Agreement Type table. | `LOOKUP_CODE` |
| field 31 | FR | If USA License Ind is entered, it must match a value in the USA License Indicator table. | `LOOKUP_CODE` |
| field 32 | TR | If the role code is ‘AQ’, this SPU record must follow an SPU record with a role code of  | `PUBLISHER_CHAIN_ROLE` |
| field 37 | TR | If entered, Publisher Name must contain only valid ASCII characters from within the “Nam | `CHARACTER_SET` |
| field 40 | TR | If Record Type is equal to SPU and is the collecting publisher the Publisher IPI Name Nu | `PARTY_CONSISTENCY` |
| recor 2 | TR | The first SPU record within a chain must be for an Original Publisher or Income Particip | `PUBLISHER_CHAIN_ROLE` |
| recor 3 | TR | If Publisher Type is equal to “SE” or “AM” or “PA” or “ES”, Ownership Shares must be equ | `PUBLISHER_CHAIN_ROLE` |
| recor 4 | TR | If Publisher Type is equal "AM", the publisher must have the right to administer for the | _not evaluable_ |
| recor 5 | TR | Administrators and sub-publishers must be assigned the publisher sequence number belongi | `PWR_SEQ_MISMATCH` |
| recor 8 | TR | If the record represents an Acquirer, at least one of PR Ownership share, MR Ownership s | `PUBLISHER_CHAIN_ROLE` |

### Publisher territories (§5.7, §5.8): 13/13 covered

| Rule | Sev | Requirement | Implemented by |
|---|---|---|---|
| field 1 | TR | When entered, SPT records must follow an SPU, NPN or SPT record. | `RECORD_ORDER` |
| field 2 | TR | The Interested Party # must be entered and must be equal to the Interested Party # on th | `PUBLISHER_TERRITORY_REQUIRED` |
| field 6 | TR | PR Collection Share must be between 00000 (0%) and 5000 (50%). | `FIELD_FORMAT` |
| field 7 | TR | MR Collection Share must be between 00000 (0%) and 10000 (100%). | `FIELD_FORMAT` |
| field 8 | TR | SR Collection Share must be between 00000 (0%) and 10000 (100%). | `FIELD_FORMAT` |
| field 9 | TR | TIS Numeric Code must be entered and must match an entry in the TIS database. | `LOOKUP_CODE` |
| field 10 | TR | Inclusion/Exclusion Indicator must be entered and must be either “E” for excluded or “I” | `TERRITORY_IE_CONTRADICTION` |
| field 11 | FR | If Shares change is entered, it must be set to “Y” or “N”. | `LOOKUP_CODE` |
| field 12 | RR | Sequence # must be present. | `MANDATORY_FIELD` |
| field 13 | RR | Sequence # must be 1 for the first SPT/OPT after an SPU/OPU, and increment by 1 for each | `PARTY_CONSISTENCY` |
| field 14 | TR | When entered, OPT records must follow an SPU, NPN, SPT, OPU or OPT record. | `RECORD_ORDER` |
| recor 1 | TR | If the Inclusion/Exclusion Indicator is “I”, at least one of PR Collection Share, MR Col | `TERRITORY_RECORD` |
| recor 5 | TR | Each Territory (TIS code) included on an SPT/OPT record can only be linked to one SPU/OP | `TERRITORY_RECORD` |

### Writers (§5.9, §5.10): 23/25 covered

| Rule | Sev | Requirement | Implemented by |
|---|---|---|---|
| field 1 | TR | If Record Type is equal to SWR, Interested Party # must be entered. | `MANDATORY_FIELD` |
| field 2 | TR | Submitters must ensure that the Interested Party # is unique within their system for bot | `PARTY_IP_BIJECTION` |
| field 3 | TR | If Record Type is equal to SWR or Writer Unknown Indicator is not equal to “Y”, Writer L | `MANDATORY_FIELD` |
| field 4 | TR | If Record Type is equal to SWR, Writer Unknown Indicator must be blank. | `PARTY_CONSISTENCY` |
| field 5 | FR | If Record Type is equal to OWR, and Writer Unknown Indicator is entered, it must be equa | `LOOKUP_CODE` |
| field 6 | FR | If Record Type is equal to OWR, and Writer Unknown Indicator is equal to “Y”, Writer Las | `PARTY_CONSISTENCY` |
| field 7 | TR | For SWR records, Writer Designation Code must be entered. | `MANDATORY_FIELD` |
| field 8 | TR | If entered, Writer Designation Code must match an entry in the Writer Designation table. | `WRITER_DESIGNATION` |
| field 9 | FR | If entered, Writer IPI Name # must match a writer entry in the IPI database. | _not evaluable_ |
| field 10 | FR | If entered, PR Affiliation Society # must match an entry in the Society Code table. | `LOOKUP_CODE` |
| field 11 | TR | PR Ownership Share must be numeric. The value must also be between 00000 (0%) and 10000  | `FIELD_FORMAT` |
| field 12 | FR | If entered, MR Affiliation Society # must match an entry in the Society Code table | `LOOKUP_CODE` |
| field 13 | TR | MR Ownership Share must be numeric. The value must also be between 00000 (0%) and 10000  | `FIELD_FORMAT` |
| field 14 | FR | If entered, SR Affiliation Society # must match an entry in the Society Code table. | `LOOKUP_CODE` |
| field 15 | TR | SR Ownership Share must be numeric. The value must also be between 00000 (0%) and 10000  | `FIELD_FORMAT` |
| field 16 | FR | If entered, Reversionary Indicator must be equal to Y, N, or U. | `LOOKUP_CODE` |
| field 17 | FR | If entered, First Recording Refusal Ind must be equal to Y or N. | `LOOKUP_CODE` |
| field 18 | FR | If entered, Work for Hire Indicator must be equal to ‘Y’ or ‘N’ | `LOOKUP_CODE` |
| field 20 | TR | When Version equals “MOD”, if Writer Designation code equal “C” or “CA” or “A” and with  | `CONDITIONAL_RECORDS` |
| field 21 | FR | If entered, Tax ID must be numeric. | `FIELD_FORMAT` |
| field 22 | FR | If Writer IPI Base Number is entered, it must match an entry in the IPI database. | _not evaluable_ |
| field 24 | FR | If USA License Ind is entered, it must match a value in the USA License Indicator table. | `LOOKUP_CODE` |
| field 29 | TR | If entered, Writer Last Name must contain only valid ASCII characters from within the “N | `CHARACTER_SET` |
| field 30 | TR | If entered, Writer First Name must contain only valid ASCII characters from within the “ | `CHARACTER_SET` |
| recor 2 | TR | Unless the total writers’ ownership shares is equal to 100% for each right (that is, the | `PWR_LINK_MISSING` |

### Writer territories (§5.12, §5.13): 16/16 covered

| Rule | Sev | Requirement | Implemented by |
|---|---|---|---|
| field 1 | TR | An SWT record must follow an SWR, NWN or SWT record. | `RECORD_ORDER` |
| field 2 | TR | For an SWT record The Interested Party # must be entered and must be equal to the Intere | `WRITER_TERRITORY_REQUIRED` |
| field 3 | TR | PR Collection Share must be between 00000 (0%) and 10000 (100%). | `FIELD_FORMAT` |
| field 4 | TR | MR Collection Share must be between 00000 (0%) and 10000 (100%). | `FIELD_FORMAT` |
| field 5 | TR | SR Collection Share must be between 00000 (0%) and 10000 (100%). | `FIELD_FORMAT` |
| field 6 | TR | TIS Numeric Code must be entered and must match an entry in the TIS database. | `LOOKUP_CODE` |
| field 7 | TR | Inclusion/Exclusion Indicator must be entered and must be either “E” for excluded or “I” | `TERRITORY_IE_CONTRADICTION` |
| field 8 | FR | If Shares change is entered, it must be set to “Y” or “N”. | `LOOKUP_CODE` |
| field 9 | RR | Sequence # must be present. | `MANDATORY_FIELD` |
| field 10 | RR | Sequence # must be 1 for the first SWT after an SWR and increment by 1 for each subseque | `PARTY_CONSISTENCY` |
| field 11 | TR | An OWT must follow an OWR, NWN, or OWT record. | `RECORD_ORDER` |
| field 12 | TR | An OWT must not follow a SWR in a controlled chain. | `RECORD_ORDER` |
| field 13 | TR | For an OWT record the Interested Party # must be equal to the Interested Party # on the  | `WRITER_TERRITORY_REQUIRED` |
| recor 1 | TR | If the Inclusion/Exclusion Indicator is “I”, at least one of PR Collection Share, MR Col | `TERRITORY_RECORD` |
| recor 2 | TR | Each Territory (TIS code) included on an SWT record can only be linked to one SWR for a  | `TERRITORY_RECORD` |
| recor 3 | FR | If the Inclusion/Exclusion Indicator is “E”, all Collection Shares must be set to zero. | `TERRITORY_RECORD` |

### Publisher for writer (§5.14): 7/9 covered

| Rule | Sev | Requirement | Implemented by |
|---|---|---|---|
| field 3 | FR | If Submitter Agreement Number is entered, it must match the identifier for an original a | _not evaluable_ |
| field 4 | FR | If Society-Assigned Agreement Number is entered, it must match the identifier for an ori | _not evaluable_ |
| field 7 | TR | Publisher Sequence # must be entered and it must match the Publisher Sequence # of the r | `PWR_SEQ_MISMATCH` |
| field 8 | TR | For controlled chains (where the PWR follows an SWR) writer IP # must be entered. | `PWR_SEQ_MISMATCH` |
| field 9 | TR | For controlled chains (where the PWR follows an SWR) the Publisher IP # must be entered. | `PWR_SEQ_MISMATCH` |
| field 10 | TR | For controlled chains (where the PWR follows an SWR) the Publisher Name must be entered. | `PWR_SEQ_MISMATCH` |
| field 11 | TR | Writer IP # must match the Interested Party # entered on the preceding SWR/OWR record. N | `PWR_SEQ_MISMATCH` |
| field 12 | TR | Publisher IP # must match the Interested Party # for the original publisher/income parti | `PWR_SEQ_MISMATCH` |
| field 13 | FR | Publisher Name must match the name of the original publisher/income participant referenc | `PWR_SEQ_MISMATCH` |

### Alternate titles (§5.15): 6/6 covered

| Rule | Sev | Requirement | Implemented by |
|---|---|---|---|
| field 1 | RR | Alternate Title must be entered. | `MANDATORY_FIELD` |
| field 2 | FR | Title Type must be entered and must match an entry in the Title Type table other than “O | `RECORDING_IDENTIFIERS` |
| field 3 | RR | If Language Code is entered, it must match an entry in the Language Code Table. | `LOOKUP_CODE` |
| field 4 | RR | The Alternate Title must contain only valid ASCII characters from within the “Titles” se | `CHARACTER_SET` |
| field 5 | RR | If the Title Type is equal to “OL” or “AL”, the Alternate Title must contain only valid  | `CHARACTER_SET` |
| field 6 | RR | If the Title Type is equal to “OL” or “AL”, Language Code must be entered. | `RECORDING_IDENTIFIERS` |

### Performing artists (§5.19): 3/5 covered

| Rule | Sev | Requirement | Implemented by |
|---|---|---|---|
| field 1 | RR | Performing Artist Last Name must be entered. | `MANDATORY_FIELD` |
| field 2 | FR | If Performing Artist IPI Name # is entered, it must match an entry on the IPI database. | _not evaluable_ |
| field 3 | FR | If Performing Artist IPI Base Number is entered, it must match an entry in the IPI datab | _not evaluable_ |
| field 4 | RR | Performing Artist Last Name must contain only valid ASCII characters from within the ‘Na | `CHARACTER_SET` |
| field 5 | RR | If entered, Performing Artist First Name must contain only valid ASCII characters from w | `CHARACTER_SET` |

### Recordings (§5.21): 12/13 covered

| Rule | Sev | Requirement | Implemented by |
|---|---|---|---|
| field 1 | RR | At least one of the optional fields must be entered. | `PARTY_CONSISTENCY` |
| field 2 | FR | If entered, Release Date must be a valid date. | `FIELD_FORMAT` |
| field 3 | FR | If entered, Release Duration must be a valid combination of hours, minutes, and seconds. | `FIELD_FORMAT` |
| field 9 | FR | If entered, EAN must be a valid European Article Number of release. | `RECORDING_IDENTIFIERS` |
| field 10 | FR | If entered, ISRC must be a valid International Standard Recording Code. | `RECORDING_IDENTIFIERS` |
| field 11 | FR | If entered, Recording Format must be “A” for Audio or “V” for video. | `LOOKUP_CODE` |
| field 12 | FR | If entered, Recording Technique must be “A” for analogue, “D” for digital or “U” for unk | `LOOKUP_CODE` |
| field 14 | FR | If entered, the Media type must match an entry from the BIEM/CISAC list of Media Types. | `LOOKUP_CODE` |
| field 15 | FR | If entered, the First Album Title must contain only valid ASCII characters from within t | `CHARACTER_SET` |
| field 16 | TR | If entered, Recording Title must contain only valid ASCII characters from within the ‘Ti | `CHARACTER_SET` |
| field 17 | TR | If entered, Version Title must contain only valid ASCII characters from within the ‘Titl | `CHARACTER_SET` |
| field 18 | RR | If an ISRC is supplied, ISRC Validity must be Y, N, or U. | `RECORDING_IDENTIFIERS` |
| field 19 | RR | If entered, the Submitter Recording Identifier must uniquely identify the recording. | _not evaluable_ |
