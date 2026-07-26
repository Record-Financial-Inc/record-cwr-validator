// Layer 3 — CISAC Appendix A performance-share ranges: writers should retain at least 50% of
// performance (PR) ownership, and publishers should hold at most 50%. A WARNING (a best-practice
// range, not an a society hard-reject) gated to works whose PR already reconciles to 100% — otherwise the
// overclaim/under-claim rule is the real signal.

import type { CwrIssue } from '../types';
import type { TxRule } from '../context';
import { isPublisher, isWriter, TOLERANCE } from '../shared';

export const appendixAPerformanceRule: TxRule = {
  id: 'APPENDIX_A_PR_RANGE',
  category: 'overclaim',
  layer: 3,
  phase: 4,
  run(ctx) {
    const writers = ctx.readable.filter(isWriter);
    const pubs = ctx.readable.filter(isPublisher);
    if (writers.length === 0) return []; // not applicable

    const writersPr = writers.reduce((s, r) => s + r.ownership.pr, 0);
    const pubsPr = pubs.reduce((s, r) => s + r.ownership.pr, 0);
    // Only meaningful when PR reconciles to 100% — otherwise the share-total rule is the signal.
    if (Math.abs(writersPr + pubsPr - 1) > TOLERANCE) return [];

    const out: CwrIssue[] = [];
    if (writersPr < 0.5 - TOLERANCE) {
      out.push(ctx.issue('warning', 'overclaim', `Writers hold ${(writersPr * 100).toFixed(1)}% of performance — CISAC Appendix A expects writers to retain at least 50%.`, writers.map((r) => r.line)));
    }
    if (pubsPr > 0.5 + TOLERANCE) {
      out.push(ctx.issue('warning', 'overclaim', `Publishers hold ${(pubsPr * 100).toFixed(1)}% of performance — CISAC Appendix A caps publisher performance ownership at 50%.`, pubs.map((r) => r.line)));
    }
    return out;
  },
};
