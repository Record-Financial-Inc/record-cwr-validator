// Slice a raw fixed-width CWR line into its fields using the record grammar. One pass; the read side
// (parser/validator) consumes this instead of duplicating byte offsets.

import { getGrammar, type FieldSpec } from './record-grammar';

export interface ExtractedField {
  spec: FieldSpec;
  /** The trimmed field value. */
  value: string;
  /** The raw slice, untrimmed (significant for fixed-width/blank fields). */
  raw: string;
}

export interface ExtractedRecord {
  head: string;
  fields: Map<string, ExtractedField>;
}

/** Extract a raw line's fields, or null if the line's record type isn't in the grammar. */
export function extractRecord(line: string): ExtractedRecord | null {
  const head = line.slice(0, 3);
  const grammar = getGrammar(head);
  if (!grammar) return null;

  const fields = new Map<string, ExtractedField>();
  for (const spec of grammar) {
    const raw = line.slice(spec.start, spec.start + spec.len);
    fields.set(spec.key, { spec, raw, value: raw.trim() });
  }
  return { head, fields };
}

/** Convenience: the trimmed value of one field on a raw line, or '' if absent. */
export function fieldValue(line: string, key: string): string {
  return extractRecord(line)?.fields.get(key)?.value ?? '';
}
