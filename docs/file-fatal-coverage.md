# File-fatal rule coverage — CWR19-1070

The 29 **ER** (entire file rejected) and **GR** (group rejected) validations that govern a work
registration. They are evaluated at the envelope, before or independently of any transaction, so a
file that breaks one is refused whole and produces no acknowledgement and no rejection report. There
is nothing to diagnose from, which makes these the rules least discoverable by submitting and the
most worth enforcing locally.

Verified rule by rule against the implementation, not inferred from category counts.

## Covered — 24 of 29

| Rule | Sev | Requirement | Enforced by |
|---|---|---|---|
| HDR FV1 | ER | Record Type must be HDR | `FRAMING` |
| HDR FV2 | ER | Sender Type is PB/SO/WR/AA, or the leading 2 digits of an IPNN | `SENDER_REGISTERED` |
| HDR FV3 | ER | Sender ID must match the CWR Sender ID and Codes Table | `SENDER_REGISTERED` * |
| HDR FV5 | ER | For PB, Sender Name must match the registered name | `SENDER_REGISTERED` * |
| HDR FV9 | ER | EDI Standard Version Number must be `01.10` | `ENVELOPE_CONSTANTS` |
| HDR FV10 | ER | Creation Date must be a valid date | `ENVELOPE_FIELD` |
| HDR FV11 | ER | Transmission Date must be a valid date | `ENVELOPE_FIELD` |
| HDR FV12 | ER | For PB, the Sender ID must be an approved CWR participant | `SENDER_REGISTERED` * |
| HDR FV14 | ER | Character Set, if entered, must be a valid value | `ENVELOPE_FIELD` |
| HDR FV15 | ER | Version, if entered, must be 2.2 | `ENVELOPE_CONSTANTS` |
| HDR FV16 | ER | Revision, if entered, must be the current 2.2 revision | `ENVELOPE_CONSTANTS` |
| GRH FV1 | GR | Transaction Type must match the Transaction Type table | `ENVELOPE_FIELD` |
| GRH FV2 | GR | Group ID starts at 1 and increments by 1 | `ENVELOPE_CONSTANTS` |
| GRH FV3 | ER | A GRH follows either a GRT or the HDR | `ENVELOPE_CONSTANTS` |
| GRH FV4 | GR | Version Number must be `02.20` | `ENVELOPE_CONSTANTS` |
| GRH FV5 | GR | Each group transaction type is used once per file | `ENVELOPE_CONSTANTS` |
| GRT FV1 | GR | Group ID equals that of the preceding GRH | `ENVELOPE_CONSTANTS` |
| GRT FV2 | GR | Transaction count equals the group's transactions | `TRAILER_COUNTS` |
| GRT FV3 | GR | Record count equals the group's records, GRH and GRT inclusive | `TRAILER_COUNTS` |
| TRL FV1 | ER | Group Count equals the groups in the file | `TRAILER_COUNTS` |
| TRL FV2 | ER | Transaction count equals the transactions in the file | `TRAILER_COUNTS` |
| TRL FV3 | ER | Record count equals the records, HDR and TRL inclusive | `TRAILER_COUNTS` |
| NWR r22 | GR | A transaction's record type matches its group's type | `ENVELOPE_CONSTANTS` |

\* Requires the CWR Sender ID and Codes Table (CWR06-1972), a CISAC members-only document that
cannot be redistributed. Supplied via `setCwrSenderRegister`. Without it these report **unverifiable**
at warning severity rather than passing, because an ER-severity rule that could not run is not a pass.

## Not covered — 5 of 29

| Rule | Sev | Requirement | Why not |
|---|---|---|---|
| HDR FV4 | ER | For SO senders, Sender ID must match the Society Code Table | Society senders are societies transmitting to publishers. A publisher-side submitter never writes one, so this is unexercised; the society code table is present and it is implementable. |
| HDR FV6 | ER | For SO senders, Sender Name must match the Society Code Table | As above. |
| HDR FV7 | ER | For AA senders, Sender ID must carry the IPI of the publisher represented | Administrative-agency senders are not yet modelled. Note the rule also forbids co-mingling multiple submitting publishers in one file. |
| HDR FV8 | ER | For AA senders, Sender Name must match the Publisher Code Table | As above. |
| GRT FV4 | GR | Currency Indicator is mandatory if Total Monetary Value is present | The specification states both fields "will be ignored for CWR", so there is nothing to enforce. |

Four of the five gaps concern sender types a publisher-side submitter does not produce; the fifth is
explicitly inert. No gap affects a file this engine writes.

## Note on severity

A rule's severity is the specification's, not a judgement. Where this engine reports an ER or GR rule
it does so as an `error`, which blocks. Where it cannot evaluate one it says so rather than staying
silent, because silence and a pass are indistinguishable to a caller.

---

# Publisher record coverage — §5.4 SPU/OPU

39 rules, verified rule by rule.

## Covered — 30 of 39

| Rule | Sev | Requirement | Enforced by |
|---|---|---|---|
| Rec 2 | TR | A chain is headed by an Original Publisher or Income Participant | `PUBLISHER_CHAIN_ROLE` |
| Rec 3 | TR | SE / AM / PA / ES hold no ownership | `PUBLISHER_CHAIN_ROLE` |
| Rec 5 | TR | Administrators and sub-publishers take the chain's sequence number | `PWR_SEQ_MISMATCH`, `RECORD_ORDER` |
| Rec 8 | TR | An Acquirer holds more than zero in some right | `PUBLISHER_CHAIN_ROLE` |
| FV1 | TR | Publisher Sequence # entered; chains numbered from 1 upward | `MANDATORY_FIELD`, `RECORD_ORDER` |
| FV2 | TR | SPU carries an Interested Party # | `MANDATORY_FIELD` |
| FV3 | TR | An Interested Party # is unique per party | `PARTY_IP_BIJECTION` |
| FV4 | TR | Publisher Name entered | `MANDATORY_FIELD` |
| FV5 | TR | Publisher Type entered on an SPU | `MANDATORY_FIELD` |
| FV6 | TR | Publisher Type matches the Publisher Type table | `PUBLISHER_ROLE` |
| FV8 | FR | OPU Publisher Unknown Indicator is Y or N | `LOOKUP_CODE` |
| FV12 / 15 / 17 | FR | PR / MR / SR Affiliation Society # match the Society Code table | `LOOKUP_CODE` |
| FV13 | TR | PR Ownership Share is numeric, 0 to 50.00% | `FIELD_FORMAT` |
| FV16 / 18 | TR | MR / SR Ownership Share numeric, 0 to 100.00% | `FIELD_FORMAT` |
| FV19 | TR | Only "E" and "AQ" hold ownership | `PUBLISHER_CHAIN_ROLE` |
| FV20 | FR | Special Agreement Indicator matches its table | `LOOKUP_CODE` |
| FV21 | FR | First Recording Refusal Indicator is Y or N | `LOOKUP_CODE` |
| FV23 | FR | Tax ID numeric | `FIELD_FORMAT` |
| FV30 | FR | Agreement Type matches its table | `LOOKUP_CODE` |
| FV31 | FR | USA License Indicator matches its table | `LOOKUP_CODE` |
| FV32 | TR | An "AQ" follows an "E" | `PUBLISHER_CHAIN_ROLE` |
| FV10 / 24 | FR | Publisher IPI Name # and Base Number are well formed | `IPI_FORMAT`, `CHECK_DIGIT` * |

\* Format and check digit only. Confirming an IPI exists needs the IPI database, which is not
distributed; a wrong-but-well-formed number still passes, which is why a clean report means
well-formed rather than verified correct.

## Not covered — 9 of 39

| Rule | Sev | Requirement | Why not |
|---|---|---|---|
| Rec 4 | TR | An "AM" must have the right to administer for the preceding publisher | Not derivable from the file. It asserts a fact about an agreement, which lives in the AGR transaction or the society's records. |
| FV7 | TR | SPU Publisher Unknown Indicator must be blank | Cheap to add; no file yet observed setting it on an SPU. |
| FV9 | FR | An OPU with Unknown Indicator "Y" has a blank Publisher Name | Conditional cross-field rule; only fires on third-party files. |
| FV11 / 25 / 26 | FR | Agreement numbers must match an agreement on file | Requires the society's agreement register. |
| FV27 | FR | OPU Special Agreements Indicator is "L" or blank | Cheap to add. |
| FV28 | FR | An OPU with an invalid publisher type defaults to "E" | A defaulting instruction to the recipient, not a rejection. |
| FV29 | TR | A publisher named like a society must carry a valid IPI | Needs society-name matching against the Society Code table. |
| FV37 | TR | Publisher Name uses only the CIS "Names" character set | The CIS character set table is not distributed. |
| FV40 | TR | A collecting SPU carries an IPI Name Number | Cheap to add; needs the collecting publisher identified from its SPT. |

Four of the nine need reference data we cannot ship (the IPI database, the agreement register, the
CIS character set). One is a defaulting instruction rather than a check. Four are implementable and
are the next increment.
