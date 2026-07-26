/** IPI Name Number helpers, shared by the parser and the rules. */

/** An IPI Name Number is 9 to 11 digits; the leading zeros are padding, not part of the number. */
export const IPI_REGEX = /^\d{9,11}$/;

/** Drop leading-zero padding so "01234567846" and "1234567846" compare as one party. */
export function normaliseIpi(ipi: string): string {
  return ipi.replace(/^0+/, '');
}
