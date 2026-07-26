// Fixed record widths from CWR19-1070, the one piece of knowledge a reader and a writer share.
//
// Reading a field means slicing at an offset; writing one means padding to the same offset. If the
// two ever disagree the file is wrong in a way neither side can see, so both derive from here and
// the conformance suite asserts this table against the specification rather than against our code.

export const CWR_RECORD_LENGTHS: Record<string, number> = {
  HDR: 167,
  GRH: 26,
  GRT: 24,
  TRL: 24,
  NWR: 260,
  REV: 260,
  ISW: 260,
  EXC: 260,
  SPU: 183,
  OPU: 183,
  SPT: 58,
  OPT: 58,
  SWR: 180,
  OWR: 180,
  SWT: 52,
  OWT: 52,
  PWR: 112,
  ALT: 83,
  PER: 118,
  REC: 540,
};

/** The expected width of a record type, or null when the type is not one we model. */
export function cwrRecordLength(recordType: string): number | null {
  return CWR_RECORD_LENGTHS[recordType] ?? null;
}
