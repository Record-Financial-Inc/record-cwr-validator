# CISAC conformance matrix — CWR19-1070
Generated from the specification text, not from the implementation. This is the denominator.
- **380** universal validation rules across all record types
- **207** of those govern the record types in a work-registration transaction (what this engine reads and writes)
- **93** society-specific rules live in specification section 7 and are out of scope by default

Severities are the specification's own: ER entire file rejected, GR group rejected, TR transaction rejected, RR record rejected, FR field rejected.

## Coverage by record type
| Record | Rules | ER | GR | TR | RR | FR |
|---|---:|---:|---:|---:|---:|---:|
| NWR/REV/ISW/EXC | 48 | 0 | 1 | 36 | 1 | 10 |
| SPU/OPU | 39 | 0 | 0 | 20 | 0 | 17 |
| SWR/OWR | 25 | 0 | 0 | 13 | 0 | 12 |
| HDR | 16 | 16 | 0 | 0 | 0 | 0 |
| SWT/OWT | 16 | 0 | 0 | 12 | 2 | 2 |
| PWR | 14 | 0 | 0 | 6 | 0 | 3 |
| SPT/OPT | 13 | 0 | 0 | 10 | 2 | 1 |
| REC | 13 | 0 | 0 | 2 | 3 | 8 |
| ALT | 6 | 0 | 0 | 0 | 5 | 1 |
| GRH | 5 | 1 | 4 | 0 | 0 | 0 |
| PER | 5 | 0 | 0 | 0 | 3 | 2 |
| GRT | 4 | 0 | 4 | 0 | 0 | 0 |
| TRL | 3 | 3 | 0 | 0 | 0 | 0 |

## File-fatal rules (ER and GR)
These are evaluated before, or independently of, any transaction. A file failing one is rejected in whole or by group, which is why it can produce no acknowledgement.

- **[GR] GRH field 1** (p15): Transaction Type must be entered and must match an entry in the Transaction Type table.
- **[GR] GRH field 2** (p15): Group ID must be entered, must start at 1, and must increment by 1 sequentially for each new group in the file.
- **[ER] GRH field 3** (p15): GRH records must follow either a GRT record or an HDR record.
- **[GR] GRH field 4** (p15): For use of the CWR version 2 as described in this document, the Version Number must be '02.20’.
- **[GR] GRH field 5** (p15): Each Group Transaction type can only be used once per file.
- **[GR] GRT field 1** (p16): Group ID must be equal to the Group ID presented on the previous GRH record.
- **[GR] GRT field 2** (p16): Transaction count must be equal to the total number of transactions within this group.
- **[GR] GRT field 3** (p16): Record count must be equal to the total number of physical records inclusive of the GRH and GRT records.
- **[GR] GRT field 4** (p16): Currency Indicator is mandatory if Total Monetary Value is provided
- **[ER] HDR field 1** (p14): Record Type must be equal to HDR.
- **[ER] HDR field 2** (p14): Sender Type must be equal to PB (publisher), SO (society), WR (writer), or AA (administrative agency) except where sender needs to use the Sender Type field to supply the leading 2 numbers of their IPNN.
- **[ER] HDR field 3** (p14): If Sender Type is equal to PB, WR, or AA, Sender ID must be entered and must match the assigned entry in the CWR Sender ID and Codes Table and if Sender Type has the leading 2 numbers of the Sender’s IPNN, then Sender Type plus Sender ID must match the assigned entry in the CWR Sender ID and Codes Table.
- **[ER] HDR field 4** (p14): If Sender Type is equal to SO, Sender ID must be entered and must match an entry in the Society Code Table.
- **[ER] HDR field 5** (p14): If Sender Type is equal to PB, Sender Name must match the name on the corresponding entry in the CWR Sender ID and Codes Table.
- **[ER] HDR field 6** (p14): If Sender Type is equal to SO, Sender Name must match the name on the corresponding entry in the Society Code Table.
- **[ER] HDR field 7** (p14): If Sender Type is equal to AA, Sender ID must contain the IPI# of the Publisher that the Administrative Agency is acting on behalf of. Note that transactions for multiple submitting publishers cannot be co- mingled in a single file.
- **[ER] HDR field 8** (p14): If Sender Type is equal to AA, Sender Name must match the name on the corresponding entry in the Publisher Code Table.
- **[ER] HDR field 9** (p14): EDI Standard Version Number must be equal to the constant value “01.10”.
- **[ER] HDR field 10** (p14): Creation Date must be a valid date.
- **[ER] HDR field 11** (p14): Transmission Date must be a valid date.
- **[ER] HDR field 12** (p14): If the Sender Type is PB, the Sender ID must be for an approved CWR participant.
- **[ER] HDR field 13** (p14): If the Sender Type is equal to WR, Sender ID must be a valid IPI # for a writer.
- **[ER] HDR field 14** (p14): If entered, the Character Set must be one of Traditional [Big5] or Simplified [GB] or a value from the Unicode table, UTF-8 (reference www.unicode.org/charts)
- **[ER] HDR field 15** (p15): Version if entered and must be 2.2
- **[ER] HDR field 16** (p15): Revision number if entered must be a valid CWR version 2.2 revision number from the version number lookup table, the current value must be 1 (for this revision 1)
- **[GR] NWR/REV/ISW/EXC transaction 22** (p25): The Transaction Record Type (e.g. NWR or REV) must be the same as the Transaction Type of the immediately preceding GRH record.
- **[ER] TRL field 1** (p17): Group Count must be equal to the number of groups within the entire file.
- **[ER] TRL field 2** (p17): Transaction count must be equal to the number of transactions within the entire file.
- **[ER] TRL field 3** (p17): Record count must be equal to the number of physical records inclusive of the HDR and TRL records.

## Society-specific rules (section 7, opt-in)

- SGAE: 22
- ICE Societies: 13
- SACEM: 12
- GEMA: 10
- ICE: 9
- ASCAP: 9
- Societies requiring Society Assigned Agreement Numbers: 4
- MusicMark: 3
- Harry Fox: 2
- ABRAMUS and UBC: 2
- SIAE: 2
- BMI: 2
- SESAC: 2
- MusicMark societies: 1

No society-specific edits exist for every society a submitter may deal with; a submitter outside this list is held only to the universal rules.
