// Layer 3 — PWR (Publisher-For-Writer) chain integrity. A controlled writer (SWR) must be linked
// to a publisher in the work via a PWR record, and that PWR must point at a real publisher chain.
// Without it there is no way to tell who administers the writer.

import type { CwrIssue } from '../types';
import type { TxRule } from '../context';
import { isPublisher, isWriter, isPwr, RIGHTS, TOLERANCE } from '../shared';
import type { PublisherRecord, WriterRecord } from '../../parse/parse-cwr';

const normaliseName = (value: string): string => value.trim().replace(/\s+/g, ' ').toUpperCase();

/**
 * Every controlled writer (SWR) needs a PWR linking it to a publisher — unless the work is
 * unpublished.
 *
 * CWR19-1070 §5.9 p47 record validation 2 states the requirement with its own exemption: "Unless
 * the total writers' ownership shares is equal to 100% for each right (that is, the work is
 * unpublished), each SWR record must be [linked to a publisher]". When the writers hold everything
 * there is no publisher to point at, and demanding a PWR would flag a conformant file.
 *
 * WARNING rather than error: a controlled writer with no representing publisher is an edge we audit
 * before promoting (invariant I3).
 */
export const pwrLinkMissingRule: TxRule = {
  id: 'PWR_LINK_MISSING',
  category: 'link',
  layer: 3,
  phase: 1,
  run(ctx) {
    const writers = ctx.readable.filter(isWriter);

    // The exemption: for every right actually used in this work, the writers hold all of it. A
    // right nobody claims (commonly SR) does not, on its own, make a work published.
    const writersHoldEverything = RIGHTS.every((right) => {
      const total = writers.reduce((sum, w) => sum + (w.ownership[right] ?? 0), 0);
      return total <= TOLERANCE || Math.abs(total - 1) <= TOLERANCE;
    }) && RIGHTS.some((right) => (
      Math.abs(writers.reduce((sum, w) => sum + (w.ownership[right] ?? 0), 0) - 1) <= TOLERANCE
    ));
    if (writersHoldEverything) return [];

    const out: CwrIssue[] = [];
    const pwrs = ctx.readable.filter(isPwr);
    for (const swr of writers) {
      if (swr.type !== 'SWR') continue; // controlled writers only (OWR are uncontrolled)
      const linked = pwrs.some((p) => p.writerIp === swr.ip);
      if (!linked) {
        out.push(ctx.issue('warning', 'link', `Controlled writer "${swr.lastName || swr.ip}" has no PWR record linking it to a publisher (CWR19-1070 §5.9 p47 record validation 2; §5.14 p52).`, [swr.line]));
      }
    }
    return out;
  },
};

/** A PWR's publisher sequence must match a real publisher chain (SPU/OPU) in the same work. */
export const pwrSeqMismatchRule: TxRule = {
  id: 'PWR_SEQ_MISMATCH',
  category: 'link',
  layer: 3,
  phase: 1,
  run(ctx) {
    const out: CwrIssue[] = [];
    const pubsBySeq = new Map<number, PublisherRecord>();
    for (const publisher of ctx.readable.filter(isPublisher)) {
      if (!pubsBySeq.has(publisher.publisherSeq)) pubsBySeq.set(publisher.publisherSeq, publisher);
    }
    let currentWriter: WriterRecord | undefined;
    for (const record of ctx.readable) {
      if (isWriter(record)) currentWriter = record;
      if (!isPwr(record)) continue;

      const publisher = pubsBySeq.get(record.publisherSeq);
      if (!publisher) {
        out.push(ctx.issue('error', 'link', `PWR references publisher sequence ${record.publisherSeq}, which has no matching publisher (SPU/OPU) in the work (CWR19-1070 §5.14 p52 field validation 7, TR — transaction rejected).`, [record.line]));
        continue;
      }

      const controlledWriterLink = currentWriter?.type === 'SWR';
      if ((controlledWriterLink || record.publisherIp) && record.publisherIp !== publisher.ip) {
        out.push(ctx.issue('error', 'link', `PWR Publisher IP "${record.publisherIp}" does not match publisher sequence ${record.publisherSeq} IP "${publisher.ip}" (CWR19-1070 §5.14 p52 field validations 9 and 12, TR — transaction rejected).`, [record.line, publisher.line]));
      }
      if ((controlledWriterLink || record.publisherName) && normaliseName(record.publisherName) !== normaliseName(publisher.name)) {
        out.push(ctx.issue('error', 'link', `PWR Publisher Name "${record.publisherName}" does not match publisher sequence ${record.publisherSeq} name "${publisher.name}" (CWR19-1070 §5.14 p52 field validations 10 and 13).`, [record.line, publisher.line]));
      }
      if (currentWriter && (controlledWriterLink || record.writerIp) && record.writerIp !== currentWriter.ip) {
        out.push(ctx.issue('error', 'link', `PWR Writer IP "${record.writerIp}" does not match the current writer IP "${currentWriter.ip}" (CWR19-1070 §5.14 p52 field validations 8 and 11, TR — transaction rejected).`, [record.line, currentWriter.line]));
      }
    }
    return out;
  },
};
