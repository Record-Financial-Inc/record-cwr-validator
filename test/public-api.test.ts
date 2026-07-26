/**
 * Package smoke tests over the public API.
 *
 * Every byte here is synthesised. No real catalogue data, writer name, IPI or ISRC appears in this
 * repository, and none ever should: a public git history keeps whatever is committed to it, so
 * scrubbing after the fact is not a remedy.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  parseCwr,
  validateCwr,
  cwrRecordLength,
  CWR_RECORD_LENGTHS,
  setCwrSenderRegister,
  ALL_RULES,
} from '../src/index';

/** Pad a record to the exact width its type requires. */
const rec = (type: string, body = ''): string => {
  const w = CWR_RECORD_LENGTHS[type];
  const s = type + body;
  return s.length >= w ? s.slice(0, w) : s + ' '.repeat(w - s.length);
};

const n = (v: number, w: number) => String(v).padStart(w, '0');

/** A minimal, well-framed file: one work, one publisher chain, one writer. */
function synthFile(): string {
  return [
    rec('HDR', 'PB' + '000000001'.padEnd(9) + 'EXAMPLE MUSIC LTD'.padEnd(45) + '01.10' + '20260101'),
    rec('GRH', 'NWR' + n(1, 5) + '02.20'),
    rec('NWR', n(0, 8) + n(0, 8) + 'A SYNTHETIC WORK'.padEnd(60)),
    rec('SPU', n(0, 8) + n(1, 8) + n(1, 2) + '000000001' + 'EXAMPLE MUSIC LTD'.padEnd(45)),
    rec('SPT', n(0, 8) + n(2, 8) + '000000001'),
    rec('SWR', n(0, 8) + n(3, 8) + '000000002' + 'SYNTHETIC'.padEnd(45)),
    rec('SWT', n(0, 8) + n(4, 8) + '000000002'),
    rec('PWR', n(0, 8) + n(5, 8) + '000000001'),
    rec('GRT', n(1, 5) + n(1, 8) + n(7, 8)),
    rec('TRL', n(1, 5) + n(1, 8) + n(9, 8)),
  ].join('\r\n') + '\r\n';
}

afterEach(() => setCwrSenderRegister(null));

describe('public API', () => {
  it('parses a well-framed file into records with no framing defects', () => {
    const parsed = parseCwr(synthFile());
    expect(parsed.malformedLines).toEqual([]);
    expect(parsed.transactionCount).toBe(1);
    expect(parsed.records.map((r) => r.type)).toEqual([
      'HDR', 'GRH', 'NWR', 'SPU', 'SPT', 'SWR', 'SWT', 'PWR', 'GRT', 'TRL',
    ]);
    expect(parsed.records.every((r) => r.framingOk)).toBe(true);
  });

  it('returns a structured report rather than throwing', () => {
    const report = validateCwr(synthFile());
    expect(report).toMatchObject({
      ok: expect.any(Boolean),
      errors: expect.any(Array),
      warnings: expect.any(Array),
      recordCount: 10,
      transactionCount: 1,
    });
  });

  it('reports an empty file as a structural error, not a crash', () => {
    const report = validateCwr('');
    expect(report.ok).toBe(false);
    expect(report.errors[0].category).toBe('structure');
  });

  it('cites the specification in its findings', () => {
    const report = validateCwr(synthFile());
    const cited = [...report.errors, ...report.warnings].filter((i) => /CWR19-1070|§\d/.test(i.message));
    expect(cited.length).toBeGreaterThan(0);
  });

  it('does not read fields off records whose framing is broken', () => {
    // Pad every record to a uniform width: a real defect that shifts every field offset.
    const padded = synthFile().split('\r\n').filter(Boolean)
      .map((l) => l.padEnd(364, ' ')).join('\r\n') + '\r\n';
    const malformed = new Set(parseCwr(padded).malformedLines);
    expect(malformed.size).toBeGreaterThan(0);

    const report = validateCwr(padded);
    const fieldDerived = ['overclaim', 'territory', 'mandatory', 'field', 'duplicate', 'link'];
    expect(
      [...report.errors, ...report.warnings].filter(
        (i) => fieldDerived.includes(i.category) && i.records.some((l) => malformed.has(l)),
      ),
    ).toEqual([]);
    // ...and it says so, rather than skipping in silence.
    expect(report.errors.some((e) => /could not be read/.test(e.message))).toBe(true);
  });

  it('treats an unsupplied sender register as unverifiable, never as a pass', () => {
    const report = validateCwr(synthFile());
    const sender = [...report.errors, ...report.warnings].find((i) => /could not be verified/.test(i.message));
    expect(sender).toBeDefined();
    expect(sender!.severity).toBe('warning');
  });

  it('rejects an unregistered sender once a register is supplied', () => {
    setCwrSenderRegister({ entries: [{ name: 'Someone Else', code: 'SEL', ipi: '01234567846' }] });
    const report = validateCwr(synthFile());
    expect(report.errors.some((e) => /not an approved CWR participant/.test(e.message))).toBe(true);
  });

  it('exposes the record width table and every registered rule', () => {
    expect(cwrRecordLength('HDR')).toBe(167);
    expect(cwrRecordLength('NOPE')).toBeNull();
    expect(ALL_RULES.length).toBeGreaterThan(25);
    for (const rule of ALL_RULES) {
      expect(rule.id).toMatch(/^[A-Z0-9_]+$/);
      expect([3, 4]).toContain(rule.layer);
    }
  });
});
