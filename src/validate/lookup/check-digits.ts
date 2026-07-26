// CISAC identifier check digits. These catch transposition/typo errors that a length/format check
// can't — a 1-digit slip in an IPI or ISWC produces a structurally valid but wrong identifier.
//
// Algorithms (ISO 7064 family; cross-checked against the CISAC IPI spec and the ISWC standard):
//   • IPI Name Number  — 11 digits = 9 base + 2 check; weighted mod-101 over the 9 base digits.
//   • IPI Base Number  — I-NNNNNNNNN-C; weighted mod-10 over the 9 digits (+2 for the leading 'I').
//   • ISWC             — T-NNN.NNN.NNN-C; weighted mod-10 over the 9 work digits (+1 for the 'T').
//   • ISRC has NO check digit — validate structurally only (handled elsewhere).
//
// Each returns null when the value isn't the full canonical length to check (e.g. a 9- or 10-digit IPI
// fragment), so callers skip rather than false-flag a non-canonical-but-acceptable identifier.

/** The 2-digit mod-101 check for the 9 base digits of an IPI Name Number. */
export function ipiNameCheckDigits(base9: string): number {
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * Number(base9[i]); // weights 10,9,…,2
  let c = sum % 101;
  if (c === 1) c = 0;
  else if (c !== 0) c = 101 - c;
  return c; // 0–99
}

/**
 * Validate an IPI Name Number. An IPI Name Number is numerically an 11-digit value (9 base + 2 check),
 * so a 10-digit value is just one with a dropped leading zero — left-pad to 11 and validate, matching
 * the CISAC reference (`sprintf("%011d", …)`). Returns null for values shorter than 10 significant
 * digits (likely a base-only fragment, not a full Name Number) so they are not false-flagged.
 */
export function validateIpiName(ipi: string): boolean | null {
  const d = ipi.trim();
  if (!/^\d{10,11}$/.test(d)) return null;
  const padded = d.padStart(11, '0');
  return ipiNameCheckDigits(padded.slice(0, 9)) === Number(padded.slice(9, 11));
}

/** Validate an IPI Base Number (I-NNNNNNNNN-C, dashes optional); null if it isn't that shape. */
export function validateIpiBase(ipiBase: string): boolean | null {
  const c = ipiBase.trim().toUpperCase().replace(/[\s-]/g, '');
  if (!/^I\d{10}$/.test(c)) return null;
  const digits = c.slice(1); // 10 digits = 9 + check
  let sum = 2; // 'I'
  for (let i = 0; i < 9; i++) sum += (i + 1) * Number(digits[i]);
  let check = sum % 10;
  if (check !== 0) check = 10 - check;
  return check === Number(digits[9]);
}

/** Validate an ISWC (T + 10 digits, separators optional); null if it isn't that shape. */
export function validateIswcCheckDigit(iswc: string): boolean | null {
  const c = iswc.trim().toUpperCase().replace(/[.\s-]/g, '');
  if (!/^T\d{10}$/.test(c)) return null;
  const digits = c.slice(1); // 9 work digits + 1 check
  let sum = 1; // 'T'
  for (let i = 0; i < 9; i++) sum += (i + 1) * Number(digits[i]);
  let check = sum % 10;
  if (check !== 0) check = 10 - check;
  return check === Number(digits[9]);
}
