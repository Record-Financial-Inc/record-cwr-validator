// Layer 3 — required child records. The CWR BNF requires each work transaction to be a complete tree:
// a work header, at least one writer, and a territory record for every controlled party. A work missing
// any of these registers incompletely (or is rejected). These emit `error`; the round-trip suite proves
// a generated CWR always satisfies them, so the export gate never trips on our own output.
// Governing rule: CWR19-1070 §4.2 p24-25 transaction rules 7, 12 and 20 (TR).

import type { CwrIssue } from '../types';
import type { FileRule, TxRule } from '../context';
import { isWork, isWriter, isPublisher, isPubTerr, isWriterTerr } from '../shared';

// Transaction-detail records that may only appear *inside* a work transaction (after an NWR/REV).
const CHILD_RECORDS = new Set([
  'SPU', 'OPU', 'SPT', 'OPT', 'SWR', 'OWR', 'SWT', 'OWT', 'PWR', 'ALT', 'REC',
  'PER', 'VER', 'EWT', 'COM', 'ORN', 'INS', 'IND', 'ARI', 'NAT', 'NWN', 'NPN',
]);

/**
 * Every work transaction must open with a header (NWR/REV/ISW). This is a FILE rule, not a
 * transaction rule, because the parser only forms a transaction once it has seen a header — an orphan
 * child record before any header is assigned no transaction and would otherwise be dropped silently.
 * So we scan the raw record stream for any child record that carries no transaction (txSeq null).
 */
export const workHeaderRequiredRule: FileRule = {
  id: 'WORK_HEADER_REQUIRED',
  category: 'structure',
  layer: 4,
  phase: 11,
  run(ctx) {
    const out: CwrIssue[] = [];
    for (const r of ctx.records) {
      if (r.txSeq == null && CHILD_RECORDS.has(r.type)) {
        out.push(ctx.issue('error', 'structure', `${r.type} record appears with no preceding NWR/REV work header.`, [r.line]));
      }
    }
    return out;
  },
};

/** Every work must name at least one writer (SWR or OWR). */
export const workWriterRequiredRule: TxRule = {
  id: 'WORK_WRITER_REQUIRED',
  category: 'structure',
  layer: 3,
  phase: 11,
  run(ctx) {
    if (!ctx.records.some(isWork)) return []; // not a work transaction — workHeader rule owns that
    if (ctx.records.some(isWriter)) return [];
    const work = ctx.records.find(isWork)!;
    return [ctx.issue('error', 'structure', 'Work has no writer (SWR/OWR) — at least one is required.', [work.line])];
  },
};

/** Every controlled publisher (SPU) must have a territory-of-control record (SPT). */
export const publisherTerritoryRequiredRule: TxRule = {
  id: 'SPU_TERRITORY_REQUIRED',
  category: 'structure',
  layer: 3,
  phase: 11,
  run(ctx) {
    // Only an SPT (controlled territory) satisfies an SPU — an OPT belongs to an uncontrolled
    // publisher. Drop blank IPs so a blank-IP territory can't vacuously satisfy a blank-IP publisher.
    const sptIps = new Set(ctx.records.filter(isPubTerr).filter((t) => t.type === 'SPT').map((t) => t.ip).filter(Boolean));
    const out: CwrIssue[] = [];
    for (const p of ctx.records.filter(isPublisher)) {
      if (p.type !== 'SPU' || !p.ip) continue; // OPU collects nothing; a blank IP is a mandatory-field issue
      if (!sptIps.has(p.ip)) {
        out.push(ctx.issue('error', 'structure', `Controlled publisher "${p.name || p.ip}" has no SPT territory-of-control record.`, [p.line]));
      }
    }
    return out;
  },
};

/** Every controlled writer (SWR) must have a territory-of-control record (SWT). */
export const writerTerritoryRequiredRule: TxRule = {
  id: 'SWR_TERRITORY_REQUIRED',
  category: 'structure',
  layer: 3,
  phase: 11,
  run(ctx) {
    // Only an SWT satisfies an SWR — an OWT belongs to an uncontrolled writer. Drop blank IPs.
    const swtIps = new Set(ctx.records.filter(isWriterTerr).filter((t) => t.type === 'SWT').map((t) => t.ip).filter(Boolean));
    const out: CwrIssue[] = [];
    for (const w of ctx.records.filter(isWriter)) {
      if (w.type !== 'SWR' || !w.ip) continue; // OWR collects nothing; a blank IP is a mandatory-field issue
      if (!swtIps.has(w.ip)) {
        out.push(ctx.issue('error', 'structure', `Controlled writer "${w.lastName || w.ip}" has no SWT territory-of-control record.`, [w.line]));
      }
    }
    return out;
  },
};
