// Structural validators for CWR field datatypes — the format half of the CISAC field ruleset, driven
// off the grammar's `datatype`. These check shape only (a numeric field is digits, a date is a real
// YYYYMMDD); identifier check digits (IPI/ISWC) live in their own rules. All accept a blank value —
// presence (mandatory/conditional) is a separate concern, so format never fires on an absent optional.

/** A CWR date: 8 digits, either the all-zero "no date" sentinel or a real calendar date. */
export function isValidCwrDate(v: string): boolean {
  if (!/^\d{8}$/.test(v)) return false;
  if (v === '00000000') return true;
  const y = +v.slice(0, 4);
  const m = +v.slice(4, 6);
  const d = +v.slice(6, 8);
  if (y < 1 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** A CWR duration/time: 6 digits HHMMSS (minutes/seconds < 60; hours unbounded for long works). */
export function isValidCwrTime(v: string): boolean {
  if (!/^\d{6}$/.test(v)) return false;
  return +v.slice(2, 4) < 60 && +v.slice(4, 6) < 60;
}

const FLAGS = new Set(['Y', 'N', 'U']);
const BOOLEANS = new Set(['Y', 'N']);

/**
 * Validate a trimmed field value against its datatype. Returns null when the value is acceptable, or a
 * short reason string when it is malformed. A blank value is always acceptable here.
 */
export function checkDatatype(datatype: string, value: string): string | null {
  if (value === '') return null;
  switch (datatype) {
    case 'numeric':
      return /^\d+$/.test(value) ? null : 'must be numeric';
    case 'percentage':
      return /^\d{1,5}$/.test(value) ? null : 'must be a 5-digit share';
    case 'date':
      return isValidCwrDate(value.padStart(8, '0')) ? null : 'is not a valid date (YYYYMMDD)';
    case 'time':
      return isValidCwrTime(value.padStart(6, '0')) ? null : 'is not a valid duration (HHMMSS)';
    case 'flag':
      return FLAGS.has(value) ? null : 'must be Y, N or U';
    case 'boolean':
      return BOOLEANS.has(value) ? null : 'must be Y or N';
    default:
      return null; // alphanum/lookup/identifier/blank datatypes are validated elsewhere
  }
}

/** Datatypes this module structurally validates (the rest are handled by lookup/identifier rules). */
export const FORMAT_DATATYPES = new Set(['numeric', 'percentage', 'date', 'time', 'flag', 'boolean']);
