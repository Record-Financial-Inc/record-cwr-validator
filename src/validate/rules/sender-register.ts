// Layer 4: submitter identity against the CWR Sender ID and Codes Table.
//
// CWR19-1070 §3.5 p14, HDR field validations 2, 3, 5 and 12, all at ER (entire file rejected).
// These are evaluated at the header, before a single transaction is read, so a file that fails them
// produces no acknowledgement and no rejection report: it simply cannot be ingested.
//
//   FV2  Sender Type must be PB, SO, WR or AA, "except where sender needs to use the Sender Type
//        field to supply the leading 2 numbers of their IPNN".
//   FV3  For PB/WR/AA the Sender ID must match the assigned entry in the CWR Sender ID and Codes
//        Table; when Sender Type carries the leading 2 digits of the IPNN, Sender Type plus Sender
//        ID together must match an entry.
//   FV5  For PB the Sender Name must match the name on that entry.
//   FV12 For PB the Sender ID must be an approved CWR participant.
//
// The register itself (CWR06-1972) is a CISAC members-only document, so it cannot be redistributed
// with this code. It is therefore a caller-supplied input. When it is absent we say so, at warning
// severity, rather than passing in silence: an unverifiable ER-severity check is not a pass.

import type { HeaderRecord } from '../../parse/parse-cwr';
import type { CwrIssue } from '../types';
import type { FileRule } from '../context';
import { LOOKUP_TABLES } from '../lookup/tables';

/** Society codes, normalised without leading zeros so "021" and "21" are the same society. */
const SOCIETY_CODES = new Set(
  [...(LOOKUP_TABLES.society_code ?? [])].map((c) => c.trim().replace(/^0+/, '')).filter(Boolean),
);

/** One row of the CWR Sender ID and Codes Table. */
export interface CwrSenderEntry {
  /** Registered publisher name. */
  name: string;
  /** Three-character submitter code (the filename sender), e.g. "NEW". */
  code: string;
  /** IPI Name Number as filed, padded or not. */
  ipi: string;
}

/**
 * The register, keyed however the caller likes; lookup is by IPI Name Number with padding ignored.
 * Supply the rows read from CWR06-1972.
 */
export interface CwrSenderRegister {
  entries: readonly CwrSenderEntry[];
}

const digits = (v: string): string => v.replace(/\D/g, '').replace(/^0+/, '');

/** Sender types the spec names explicitly; anything else must be an IPNN leading pair. */
const SENDER_TYPES = new Set(['PB', 'SO', 'WR', 'AA']);

let register: CwrSenderRegister | null = null;

/**
 * Provide the CWR Sender ID and Codes Table. Without it the sender checks report as unverifiable.
 * Pass null to clear (used by tests).
 */
export function setCwrSenderRegister(next: CwrSenderRegister | null): void {
  register = next;
}

export const senderRegisterRule: FileRule = {
  id: 'SENDER_REGISTERED',
  category: 'header',
  layer: 4,
  phase: 3,
  run(ctx) {
    const hdr = ctx.readable.find((r): r is HeaderRecord => r.type === 'HDR');
    if (!hdr) return [];

    const out: CwrIssue[] = [];
    const senderType = hdr.senderType.trim();
    const senderId = hdr.senderId.trim();
    const isIpnnPrefix = /^\d{2}$/.test(senderType);

    // FV2: the type is one of the four codes, or the leading two digits of an IPI Name Number.
    if (!SENDER_TYPES.has(senderType) && !isIpnnPrefix) {
      out.push(ctx.issue('error', 'header', `Sender Type "${senderType}" is not PB, SO, WR or AA, and is not the leading two digits of an IPI Name Number (CWR19-1070 §3.5 p14 field validation 2, ER: entire file rejected).`, [hdr.line]));
      return out;
    }

    // §3.5 FV4: a society sender identifies itself by its society code, which we do hold, so this
    // one needs no register. The table is a CWR 2.1-era snapshot, so an unknown code is reported
    // as a warning rather than asserted to be wrong.
    if (senderType === 'SO') {
      const code = senderId.replace(/^0+/, '');
      if (!code) {
        out.push(ctx.issue('error', 'header', 'Sender Type is "SO" but Sender ID is empty. A society sender must give its society code (CWR19-1070 §3.5 p14 field validation 4, ER: entire file rejected).', [hdr.line]));
      } else if (!SOCIETY_CODES.has(code)) {
        out.push(ctx.issue('warning', 'header', `Sender Type is "SO" but Sender ID "${senderId.trim()}" is not a society code we hold. §3.5 p14 field validation 4 requires it to match the Society Code Table at ER severity; our copy of that table is a CWR 2.1-era snapshot, so this is reported rather than asserted.`, [hdr.line]));
      }
      return out;
    }

    // §3.5 FV7: an administrative agency files under the IPI Name Number of the publisher it acts
    // for. Which publisher that is, is not something a file can tell us, so only the shape of the
    // identifier is checked here and the rest is stated plainly as unverifiable.
    if (senderType === 'AA') {
      const digits = senderId.replace(/\D/g, '');
      if (!/^\d{9,11}$/.test(digits)) {
        out.push(ctx.issue('error', 'header', `Sender Type is "AA" but Sender ID "${senderId.trim()}" is not an IPI Name Number, which is 9 to 11 digits. An administrative agency files under the IPI of the publisher it acts for (CWR19-1070 §3.5 p14 field validation 7, ER: entire file rejected).`, [hdr.line]));
      } else {
        out.push({
          ...ctx.issue('warning', 'header', `Sender Type is "AA", so §3.5 p14 field validation 7 requires Sender ID "${senderId.trim()}" to be the IPI Name Number of the publisher this agency acts for. Which publisher that is cannot be determined from the file, so the identifier's shape is all that was checked.`, [hdr.line]),
          unverified: true,
        });
      }
      return out;
    }

    // The identity the register is searched for: the full IPNN when the type carries its first two
    // digits, otherwise the Sender ID as filed.
    const claimed = isIpnnPrefix ? `${senderType}${senderId}` : senderId;

    if (!register) {
      // `unverified` so the surface can say the check did not run, rather than folding it in with
      // defects we actually found: or, worse, letting a file pass as fully conformant when the
      // one rule that silently sinks files at the header was never evaluated.
      out.push({
        ...ctx.issue('warning', 'header', `Sender identity "${claimed}" could not be verified: the CWR Sender ID and Codes Table (CWR06-1972) was not supplied. §3.5 p14 field validations 3 and 12 require it to match a registered entry, at ER severity: a file failing them is rejected in full at the header, before any transaction is read.`, [hdr.line]),
        unverified: true,
      });
      return out;
    }

    const match = register.entries.find((e) => digits(e.ipi) === digits(claimed));
    if (!match) {
      out.push(ctx.issue('error', 'header', `Sender identity "${claimed}" is not in the CWR Sender ID and Codes Table, so it is not an approved CWR participant (CWR19-1070 §3.5 p14 field validations 3 and 12, ER: entire file rejected before any transaction is read).`, [hdr.line]));
      return out;
    }

    // FV5: for a publisher sender the name must match the registered one.
    const norm = (v: string) => v.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (norm(hdr.senderName) !== norm(match.name)) {
      out.push(ctx.issue('error', 'header', `Sender Name "${hdr.senderName.trim()}" does not match "${match.name}", the name registered against this sender (CWR19-1070 §3.5 p14 field validation 5, ER: entire file rejected).`, [hdr.line]));
    }

    return out;
  },
};
