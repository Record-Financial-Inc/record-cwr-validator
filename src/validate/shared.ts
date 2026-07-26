// Shared constants + record type-guards used across the transaction rules.

import type {
  CwrRecord,
  WorkRecord,
  PublisherRecord,
  WriterRecord,
  PublisherTerritoryRecord,
  WriterTerritoryRecord,
  PublisherWriterRecord,
} from '../parse/parse-cwr';

/** ±0.06% as a 0–1 fraction. shareToFiveDigit rounds to hundredths of a percent. */
export const TOLERANCE = 0.0006;

export const RIGHTS = ['pr', 'mr', 'sr'] as const;
export const RIGHT_LABEL: Record<(typeof RIGHTS)[number], string> = {
  pr: 'performance',
  mr: 'mechanical',
  sr: 'sync',
};

// These assert the concrete record type: necessary because OtherRecord.type is `string`, so plain
// `r.type === 'NWR'` narrowing can't exclude it.
export const isWork = (r: CwrRecord): r is WorkRecord => r.type === 'NWR' || r.type === 'REV' || r.type === 'ISW' || r.type === 'EXC';
export const isPwr = (r: CwrRecord): r is PublisherWriterRecord => r.type === 'PWR';
export const isPublisher = (r: CwrRecord): r is PublisherRecord => r.type === 'SPU' || r.type === 'OPU';
export const isWriter = (r: CwrRecord): r is WriterRecord => r.type === 'SWR' || r.type === 'OWR';
export const isPubTerr = (r: CwrRecord): r is PublisherTerritoryRecord => r.type === 'SPT' || r.type === 'OPT';
export const isWriterTerr = (r: CwrRecord): r is WriterTerritoryRecord => r.type === 'SWT' || r.type === 'OWT';
