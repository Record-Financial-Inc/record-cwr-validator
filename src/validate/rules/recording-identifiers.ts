// Layer 3: recording and alternate-title identifiers (CWR19-1070 §5.21 REC p60, §5.15 ALT p53).
//
//   REC FV9  (FR) EAN, if entered, must be a valid European Article Number.
//   REC FV10 (FR) ISRC, if entered, must be a valid International Standard Recording Code.
//   REC FV18 (RR) If an ISRC is supplied, ISRC Validity must be "Y", "N" or "U".
//   ALT FV2  (FR) Title Type must be entered and must not be "OT" (the original title is the NWR's).
//   ALT FV6  (RR) If Title Type is "OL" or "AL", Language Code must be entered.
//
// Severity follows the specification's own grading rather than a judgement about how much the field
// matters. FR means the field is rejected and the registration proceeds without it, so it reports as
// a warning. RR means the record is rejected, which loses data the submitter intended to send, so it
// reports as an error.
//
// The identifier checks were previously left out on the grounds that catalogue ISRCs are messy and
// an ISRC is not registration-critical. The first half of that is a fact about a particular
// catalogue and not about the standard; the second is what the FR grading already says. Reporting
// at FR severity states the problem without pretending it blocks a registration.

import type { CwrIssue } from '../types';
import type { TxRule } from '../context';
import { extractRecord } from '../grammar/extract';

/** ISRC: 2-letter country, 3 alphanumeric registrant, 2-digit year, 5-digit designation. */
const ISRC = /^[A-Z]{2}[A-Z0-9]{3}\d{2}\d{5}$/;
/** ISRC validity values (§5.21 p60 field validation 18). */
const ISRC_VALIDITY = new Set(['Y', 'N', 'U']);
/** Title types whose presence obliges a language (§5.15 p53 field validation 6). */
const LANGUAGE_REQUIRED_TITLES = new Set(['OL', 'AL']);

/** EAN-13: thirteen digits whose last is a mod-10 check over the preceding twelve. */
function isValidEan13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += Number(value[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10 === Number(value[12]);
}

const field = (raw: string, key: string): string =>
  extractRecord(raw)?.fields.get(key)?.value ?? '';

export const recordingIdentifierRule: TxRule = {
  id: 'RECORDING_IDENTIFIERS',
  category: 'field',
  layer: 3,
  phase: 10,
  run(ctx) {
    const out: CwrIssue[] = [];

    for (const r of ctx.readable) {
      if (r.type === 'REC') {
        const isrc = field(r.raw, 'isrc').toUpperCase();
        if (isrc && !ISRC.test(isrc)) {
          out.push(ctx.issue('warning', 'field', `ISRC "${isrc}" is not a valid International Standard Recording Code, which is two letters, three alphanumerics, then seven digits (CWR19-1070 §5.21 p60 field validation 10, FR: the field is rejected and the registration proceeds without it).`, [r.line]));
        }

        const validity = field(r.raw, 'isrc_validity').toUpperCase();
        if (isrc && validity && !ISRC_VALIDITY.has(validity)) {
          out.push(ctx.issue('error', 'field', `ISRC Validity is "${validity}" but must be "Y", "N" or "U" when an ISRC is supplied (CWR19-1070 §5.21 p60 field validation 18, RR: record rejected).`, [r.line]));
        }

        const ean = field(r.raw, 'ean13');
        if (ean && !/^0*$/.test(ean) && !isValidEan13(ean)) {
          out.push(ctx.issue('warning', 'field', `EAN "${ean}" is not a valid European Article Number: it must be thirteen digits ending in a correct check digit (CWR19-1070 §5.21 p60 field validation 9, FR: the field is rejected).`, [r.line]));
        }
        continue;
      }

      if (r.type === 'ALT') {
        const titleType = field(r.raw, 'title_type').toUpperCase();
        // "OT" is the original title, which the work record already carries; an alternate title
        // record claiming to be the original is describing the same title twice.
        if (titleType === 'OT') {
          out.push(ctx.issue('warning', 'field', `Alternate title is typed "OT" (Original Title). The original title belongs on the work record, so an alternate title takes any type but this one (CWR19-1070 §5.15 p53 field validation 2, FR: the field is rejected).`, [r.line]));
        }
        if (LANGUAGE_REQUIRED_TITLES.has(titleType) && !field(r.raw, 'language_code')) {
          out.push(ctx.issue('error', 'field', `Alternate title is typed "${titleType}" but carries no Language Code. An original or alternate title in another language must say which (CWR19-1070 §5.15 p53 field validation 6, RR: record rejected).`, [r.line]));
        }
      }
    }

    return out;
  },
};
