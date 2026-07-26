// Layer 4 — the constant and sequencing rules on the transmission envelope.
//
// These are the file- and group-fatal validations of CWR19-1070 §3.5-§3.7. They are evaluated at
// the envelope, before or independently of any transaction, which is why a file that breaks one is
// refused whole and yields no acknowledgement to diagnose from.
//
//   HDR FV9  (ER) EDI Standard Version Number must be the constant "01.10".
//   HDR FV15 (ER) Version, if entered, must be 2.2.
//   HDR FV16 (ER) Revision, if entered, must be a valid 2.2 revision; currently 1.
//   GRH FV2  (GR) Group ID must start at 1 and increment by 1 for each new group.
//   GRH FV3  (ER) A GRH must follow either a GRT or the HDR.
//   GRH FV4  (GR) Version Number must be "02.20".
//   GRH FV5  (GR) Each group transaction type may be used only once per file.
//   GRT FV1  (GR) Group ID must equal the Group ID of the preceding GRH.
//
// Dates, times, and the coded fields (transaction type, character set) are datatype- and
// lookup-checked by ENVELOPE_FIELD, so they are not repeated here.

import type { CwrIssue } from '../types';
import type { FileRule } from '../context';
import { extractRecord } from '../grammar/extract';

const EDI_STANDARD = '01.10';
const CWR_VERSION = '2.2';
const CWR_REVISION = 1;
const GRH_VERSION = '02.20';

const field = (raw: string, key: string): string | null =>
  extractRecord(raw)?.fields.get(key)?.value ?? null;

export const envelopeConstantRule: FileRule = {
  id: 'ENVELOPE_CONSTANTS',
  category: 'header',
  layer: 4,
  phase: 4,
  run(ctx) {
    const out: CwrIssue[] = [];
    // Reads field values, so it must only consider records whose framing holds.
    const records = ctx.readable;

    const hdr = records.find((r) => r.type === 'HDR');
    if (hdr) {
      // An absent value is a missing mandatory field, which MANDATORY_FIELD owns. This rule judges
      // only a value that is present, so one defect is never reported twice.
      const edi = field(hdr.raw, 'edi_standard');
      if (edi && edi !== EDI_STANDARD) {
        out.push(ctx.issue('error', 'header', `EDI Standard Version Number is "${edi}", but must be the constant "${EDI_STANDARD}" (CWR19-1070 §3.5 p14 field validation 9, ER — entire file rejected).`, [hdr.line]));
      }
      const version = field(hdr.raw, 'cwr_version');
      if (version && version !== CWR_VERSION) {
        out.push(ctx.issue('error', 'header', `HDR Version is "${version}", but must be ${CWR_VERSION} (CWR19-1070 §3.5 p15 field validation 15, ER — entire file rejected).`, [hdr.line]));
      }
      const revision = field(hdr.raw, 'revision');
      if (revision && Number(revision) !== CWR_REVISION) {
        out.push(ctx.issue('error', 'header', `HDR Revision is "${revision}", but CWR 2.2 revision ${CWR_REVISION} is the current value (CWR19-1070 §3.5 p15 field validation 16, ER — entire file rejected).`, [hdr.line]));
      }
    }

    // Groups, in file order, with the record that precedes each so FV3 can be checked.
    const groups = records.filter((r) => r.type === 'GRH' || r.type === 'GRT');
    let expectedGroupId = 1;
    let openGroupId: number | null = null;
    const typesSeen = new Map<string, number>();

    for (const r of groups) {
      if (r.type === 'GRH') {
        const idx = records.indexOf(r);
        const prev = idx > 0 ? records[idx - 1] : null;
        // FV3 — a group header opens the file's first group or follows a closed one.
        if (prev && prev.type !== 'HDR' && prev.type !== 'GRT') {
          out.push(ctx.issue('error', 'header', `A GRH group header must follow either the HDR or a GRT, but this one follows ${prev.type} (CWR19-1070 §3.6 p15 field validation 3, ER — entire file rejected).`, [r.line]));
        }

        const version = field(r.raw, 'version_number');
        if (version && version !== GRH_VERSION) {
          out.push(ctx.issue('error', 'header', `GRH Version Number is "${version}", but CWR version 2 requires "${GRH_VERSION}" (CWR19-1070 §3.6 p15 field validation 4, GR — group rejected).`, [r.line]));
        }

        const idRaw = field(r.raw, 'group_id');
        const id = Number(idRaw);
        if (idRaw && (!Number.isFinite(id) || id !== expectedGroupId)) {
          out.push(ctx.issue('error', 'header', `Group ID is "${idRaw}", but group IDs start at 1 and increment by 1, so ${expectedGroupId} was expected (CWR19-1070 §3.6 p15 field validation 2, GR — group rejected).`, [r.line]));
        }
        openGroupId = Number.isFinite(id) ? id : expectedGroupId;
        expectedGroupId += 1;

        // FV5 — one group per transaction type per file.
        const txType = field(r.raw, 'transaction_type');
        if (txType) {
          const firstLine = typesSeen.get(txType);
          if (firstLine !== undefined) {
            out.push(ctx.issue('error', 'header', `Transaction type "${txType}" opens more than one group, but each group transaction type may be used only once per file (CWR19-1070 §3.6 p15 field validation 5, GR — group rejected).`, [firstLine, r.line]));
          } else {
            typesSeen.set(txType, r.line);
          }
        }
        continue;
      }

      // GRT FV1 — the trailer closes the group its header opened.
      const idRaw = field(r.raw, 'group_id');
      if (idRaw && openGroupId !== null && Number(idRaw) !== openGroupId) {
        out.push(ctx.issue('error', 'header', `GRT Group ID "${idRaw}" does not match the Group ID ${openGroupId} on the GRH it closes (CWR19-1070 §3.7 p16 field validation 1, GR — group rejected).`, [r.line]));
      }
      openGroupId = null;
    }

    return out;
  },
};
