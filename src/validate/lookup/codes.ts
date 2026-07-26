// CISAC CWR 2.2 code tables — the small, complete enumerations. (The large tables — the CISAC
// society list and the TIS territory list — are a separate data-population task; until they're
// ported in full, validating membership would false-reject valid-but-uncommon codes.)

/** Publisher type codes (SPU/OPU role field). */
export const PUBLISHER_ROLES = new Set(['E', 'AM', 'SE', 'PA', 'ES', 'AQ']);

/** Writer designation codes (SWR/OWR). */
export const WRITER_DESIGNATIONS = new Set(['CA', 'C', 'A', 'AR', 'AD', 'SR', 'SA', 'TR']);
