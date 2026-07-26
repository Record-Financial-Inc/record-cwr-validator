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
