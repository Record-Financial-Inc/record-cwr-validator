// CWR 2.x fixed-width parser.
//
// Reads a generated/uploaded .cwr/.V21/.V22 file back into structured records so the
// validator (core/validation/cwr-validator.ts) can reason about shares, territories and
// framing WITHOUT depending on the generator. Field offsets are the inverse of the
// authoritative layout in core/generators/cwr/record-builders.ts and the CISAC CWR 2.2
// field tables (CWR19-1070 / CWR11-1494).
//
// Shares are returned as 0–1 fractions (the 5-digit CWR field "10000" = 100.00% = 1.0),
// matching the master-format share convention.

import { cwrRecordLength } from '../spec/record-lengths';

export interface RightShares {
  pr: number;
  mr: number;
  sr: number;
}

interface BaseRecord {
  /** 1-based line number in the file. */
  line: number;
  /** The full fixed-width record line. */
  raw: string;
  /** Transaction (NWR) sequence this record belongs to; null for HDR/GRH/GRT/TRL. */
  txSeq: number | null;
  /**
   * Does this record's length match its CWR record type?
   *
   * When it does not, every field offset past the 19-char record prefix is wrong by construction,
   * so the parsed field values are whatever bytes happen to land there: not data. Field-derived
   * rules must skip these records (see `TxContext.readable`); the record type and sequence prefix
   * remain trustworthy, so structural, ordering and count rules still use them.
   */
  framingOk: boolean;
}

export interface HeaderRecord extends BaseRecord {
  type: 'HDR';
  senderType: string;
  senderId: string;
  senderName: string;
}

export interface WorkRecord extends BaseRecord {
  type: 'NWR' | 'REV' | 'ISW' | 'EXC';
  title: string;
  submitterWorkId: string;
  iswc: string;
}

/** SPU (controlled) / OPU (other): publisher with PR/MR/SR OWNERSHIP shares. */
export interface PublisherRecord extends BaseRecord {
  type: 'SPU' | 'OPU';
  publisherSeq: number;
  ip: string;
  name: string;
  /** CWR publisher type: 'E' original, 'AM' administrator, 'SE' sub-publisher, 'PA' income participant. */
  role: string;
  ipi: string;
  ownership: RightShares;
}

/** SPT (controlled) / OPT (other): publisher COLLECTION shares for one territory. */
export interface PublisherTerritoryRecord extends BaseRecord {
  type: 'SPT' | 'OPT';
  ip: string;
  collection: RightShares;
  indicator: 'I' | 'E' | string;
  tis: number;
}

/** SWR (controlled) / OWR (other): writer with PR/MR/SR OWNERSHIP shares. */
export interface WriterRecord extends BaseRecord {
  type: 'SWR' | 'OWR';
  ip: string;
  lastName: string;
  firstName: string;
  /** Writer designation code (CA/C/A/AR/AD/SR/SA/TR). Always set by the parser; optional so crafted
   *  test records needn't supply it. */
  designation?: string;
  ipi: string;
  ownership: RightShares;
}

/** SWT (controlled) / OWT (other): writer COLLECTION shares for one territory. */
export interface WriterTerritoryRecord extends BaseRecord {
  type: 'SWT' | 'OWT';
  ip: string;
  collection: RightShares;
  indicator: 'I' | 'E' | string;
  tis: number;
}

export interface PublisherWriterRecord extends BaseRecord {
  type: 'PWR';
  publisherIp: string;
  publisherName: string;
  writerIp: string;
  publisherSeq: number;
}

export interface OtherRecord extends BaseRecord {
  type: string;
}

export type CwrRecord =
  | HeaderRecord
  | WorkRecord
  | PublisherRecord
  | PublisherTerritoryRecord
  | WriterRecord
  | WriterTerritoryRecord
  | PublisherWriterRecord
  | OtherRecord;

export interface ParsedCwr {
  records: CwrRecord[];
  /** Known record types whose length differs from their CWR fixed width. */
  malformedLines: number[];
  transactionCount: number;
}

/** Convert a 5-digit CWR share field ("10000") to a 0–1 fraction (1.0). Blank/non-numeric → 0. */
function parseShare(field: string): number {
  const n = parseInt(field, 10);
  if (Number.isNaN(n)) return 0;
  return n / 10000;
}

function shares(raw: string, prAt: number): RightShares {
  // PR share at [prAt, prAt+5); MR and SR follow, each preceded by a 3-char society code
  // in OWNERSHIP records (SPU/SWR) but NOT in territory records (SPT/SWT). The caller passes
  // the correct start of each via the dedicated helpers below.
  return {
    pr: parseShare(raw.slice(prAt, prAt + 5)),
    mr: parseShare(raw.slice(prAt + 5, prAt + 10)),
    sr: parseShare(raw.slice(prAt + 10, prAt + 15)),
  };
}

/** Ownership triplets are interleaved with society codes: soc(3)+share(5) × 3. */
function ownershipShares(raw: string, prShareAt: number): RightShares {
  return {
    pr: parseShare(raw.slice(prShareAt, prShareAt + 5)),
    mr: parseShare(raw.slice(prShareAt + 8, prShareAt + 13)),
    sr: parseShare(raw.slice(prShareAt + 16, prShareAt + 21)),
  };
}

const num = (s: string): number => {
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? 0 : n;
};

/**
 * Reading is deliberately more tolerant than writing.
 *
 * We now GENERATE every record at its full CISAC width, but real third-party files right-trim
 * optional trailing fields: including the file a society accepted from a third-party converter, whose HDR stops at
 * 115 of 167 and whose SWR/OWR stop at 152 of 180. Treating those as malformed would fail files
 * the industry (and a society itself) accepts. A short record simply yields empty trailing fields, and
 * the field-level rules still flag anything genuinely missing.
 *
 * An OVER-length record stays malformed: that is the signature of a real defect (an earlier file
 * of ours padded every record to a universal 364 characters, which a society could not ingest).
 */
const SIMPLE_RECORDS = new Set(['HDR', 'GRH', 'GRT', 'TRL']);
const isMalformedLength = (type: string, raw: string, expectedLength: number): boolean => {
  if (raw.length > expectedLength) return true;
  // Below its own record prefix a line cannot be right-trimming optional tail fields; it is
  // truncated. (Prefix = record type, plus transaction and record sequence numbers.)
  return raw.length < (SIMPLE_RECORDS.has(type) ? 3 : 19);
};

/**
 * Parse a CWR file (CRLF- or LF-delimited, fixed-width records by record type).
 * Unknown record types are kept as OtherRecord so framing checks still see them.
 */
export function parseCwr(content: string): ParsedCwr {
  const lines = content.split(/\r\n|\n/).filter((l) => l.length > 0);
  const records: CwrRecord[] = [];
  const malformedLines: number[] = [];
  let currentTx: number | null = null;
  let transactionCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = i + 1;
    const type = raw.slice(0, 3);
    const expectedLength = cwrRecordLength(type);
    const malformed = expectedLength !== null && isMalformedLength(type, raw, expectedLength);
    if (malformed) malformedLines.push(line);
    // Fields are readable exactly when the framing holds. A right-trimmed record stays readable:
    // its missing tail yields blank fields, which is the tolerance documented above. An unknown
    // record type has no field parsing at all, so there is nothing to distrust.
    const framingOk = !malformed;
    const txSeqField = () => num(raw.slice(3, 11));

    switch (type) {
      case 'HDR':
        records.push({
          type: 'HDR', line, raw, framingOk, txSeq: null,
          senderType: raw.slice(3, 5).trim(),
          senderId: raw.slice(5, 14),
          senderName: raw.slice(14, 59).trim(),
        });
        break;
      case 'NWR':
      case 'REV':
      case 'ISW':
      case 'EXC':
        currentTx = txSeqField();
        transactionCount++;
        records.push({
          type, line, raw, framingOk, txSeq: currentTx,
          title: raw.slice(19, 79).trim(),
          submitterWorkId: raw.slice(81, 95).trim(),
          iswc: raw.slice(95, 106).trim(),
        });
        break;
      case 'SPU':
      case 'OPU':
        records.push({
          type, line, raw, framingOk, txSeq: currentTx,
          publisherSeq: num(raw.slice(19, 21)),
          ip: raw.slice(21, 30).trim(),
          name: raw.slice(30, 75).trim(),
          role: raw.slice(76, 78).trim(),
          ipi: raw.slice(87, 98).trim(),
          ownership: ownershipShares(raw, 115),
        });
        break;
      case 'SPT':
      case 'OPT':
        records.push({
          type, line, raw, framingOk, txSeq: currentTx,
          ip: raw.slice(19, 28).trim(),
          collection: shares(raw, 34),
          indicator: raw.slice(49, 50),
          tis: num(raw.slice(50, 54)),
        });
        break;
      case 'SWR':
      case 'OWR':
        records.push({
          type, line, raw, framingOk, txSeq: currentTx,
          ip: raw.slice(19, 28).trim(),
          lastName: raw.slice(28, 73).trim(),
          firstName: raw.slice(73, 103).trim(),
          designation: raw.slice(104, 106).trim(),
          ipi: raw.slice(115, 126).trim(),
          ownership: ownershipShares(raw, 129),
        });
        break;
      case 'SWT':
      case 'OWT':
        records.push({
          type, line, raw, framingOk, txSeq: currentTx,
          ip: raw.slice(19, 28).trim(),
          collection: shares(raw, 28),
          indicator: raw.slice(43, 44),
          tis: num(raw.slice(44, 48)),
        });
        break;
      case 'PWR':
        records.push({
          type: 'PWR', line, raw, framingOk, txSeq: currentTx,
          publisherIp: raw.slice(19, 28).trim(),
          publisherName: raw.slice(28, 73).trim(),
          writerIp: raw.slice(101, 110).trim(),
          publisherSeq: num(raw.slice(110, 112)),
        });
        break;
      default:
        records.push({ type, line, raw, framingOk, txSeq: type === 'GRT' || type === 'TRL' || type === 'GRH' ? null : currentTx });
    }
  }

  return { records, malformedLines, transactionCount };
}
