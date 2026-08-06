// The verdict in plain English, plus the per-category breakdown behind it.
//
// The engine's findings are already precise: each cites its section, page, validation number and
// severity code. What they do not say is the one thing a submitter asks first, which is "what
// happens to my file". That answer is not in any single finding: it is a property of the SET. One
// header error rejects the whole transmission before a work is read; four hundred ownership errors
// reject four hundred works and leave the rest registrable. Same count, opposite consequence.
//
// Kept in core/ and free of React so the on-screen report, the recent-validations row and the
// downloadable text all state the same verdict. A summary is small and JSON-serialisable by
// design: the history row persists one per validation, and re-derives the labels and remedies from
// the static maps rather than storing a paragraph per category eight times over.

import type { CwrIssue, CwrIssueCategory, CwrValidationResult } from './types';
import { issueCount } from './types';

/**
 * Does this finding mean the society refuses the ENTIRE file?
 *
 * "Rejected before any work is read, with no acknowledgement" is the most alarming sentence this
 * product prints, and it is true only of the ER-graded validations. The grade is not the category:
 * `header` covers both the ER envelope rules (§3.4-§3.6 framing, the sender identity) AND the
 * GR-graded group rules in ENVELOPE_CONSTANTS (GRH Version Number, a GRT Group ID that does not
 * match its GRH, a transaction type used by two groups). A GR defect refuses one GROUP: the file is
 * read, and a group rejection is not the no-acknowledgement case. Classifying by category alone
 * printed the header sentence over all five of them.
 *
 * The grade is read from the citation the message already carries, which this engine writes in a
 * fixed shape ("… field validation 3, ER: entire file rejected"). That is the same structured
 * suffix `group-by-rule.ts` splits off to state a rule once, so it is a format we control rather
 * than prose we are guessing at. A finding with no citation, or one we cannot grade, is NOT treated
 * as fatal: under-claiming sends nobody hunting a header defect that does not exist.
 */
const ENTIRE_FILE_REJECTED = /\bER: entire file rejected/;

/** One category's contribution to a verdict. Labels and remedies are re-derived, never stored. */
export interface CwrVerdictCategory {
  category: CwrIssueCategory;
  errors: number;
  warnings: number;
}

/**
 * A whole validation, compressed to what a person needs to decide what to do next.
 *
 * Deliberately holds NUMBERS and not sentences. The recent-validations row persists one of these,
 * and a stored sentence is copy frozen at the moment it was written: improve the wording and every
 * row recorded before the change keeps the old text for ever. `verdictLead()` builds the sentence
 * from these fields at render time, so the copy is always the current copy.
 */
export interface CwrVerdictSummary {
  ok: boolean;
  errors: number;
  warnings: number;
  /** Works in the file (transactions). */
  works: number;
  /** Works carrying at least one blocking error. Zero when the file fails at the envelope. */
  affectedWorks: number;
  /** True when the failure is at the envelope, so no work in the file survives. */
  fileFatal: boolean;
  /** Errors raised against the file rather than against one work. */
  fileScopedErrors: number;
  /** Checks that could not be RUN for want of reference data. Not defects: a coverage statement. */
  unverified: number;
  /** Populated categories, most findings first. */
  categories: CwrVerdictCategory[];
}

/** Raised against the file rather than against a work (invariant I2: file-scoped issues carry null). */
const isFileScoped = (issue: CwrIssue) => issue.txSeq == null;

const isFileFatal = (issue: CwrIssue) => isFileScoped(issue) && ENTIRE_FILE_REJECTED.test(issue.message);

/** Distinct works carrying at least one of these findings. */
function worksAffected(issues: readonly CwrIssue[]): number {
  const seen = new Set<number>();
  for (const issue of issues) if (issue.txSeq != null) seen.add(issue.txSeq);
  return seen.size;
}

function categoryBreakdown(errors: readonly CwrIssue[], warnings: readonly CwrIssue[]): CwrVerdictCategory[] {
  const byCategory = new Map<CwrIssueCategory, CwrVerdictCategory>();
  const add = (issue: CwrIssue, severity: 'errors' | 'warnings') => {
    const entry = byCategory.get(issue.category) ?? { category: issue.category, errors: 0, warnings: 0 };
    entry[severity] += issue.occurrences ?? 1;
    byCategory.set(issue.category, entry);
  };
  for (const issue of errors) add(issue, 'errors');
  for (const issue of warnings) add(issue, 'warnings');
  // Errors before warnings, then by weight: the category to act on first sits at the top.
  return [...byCategory.values()].sort(
    (a, b) => Number(b.errors > 0) - Number(a.errors > 0) || b.errors + b.warnings - (a.errors + a.warnings),
  );
}

function passLead(count: number, works: number, unverified: number): string {
  // `count` excludes the unverified checks, which get their own sentence above. Counting them here
  // made the number disagree with the breakdown below it: a file with 7 warnings, 1 of them an
  // unverified check, said "7 warnings below" over a list that summed to 6.
  // The verb agrees with the count: "The 1 warning below do not stop" is the kind of sentence that
  // makes a reader distrust the arithmetic beside it.
  const trailer =
    count > 0
      ? ` The ${count.toLocaleString()} warning${count === 1 ? '' : 's'} below ${count === 1 ? 'does' : 'do'} not stop the submission.`
      : '';
  // A file with no works cannot reconcile, because it holds nothing to reconcile.
  if (works === 0) return `This file has the correct shape, but it holds no works. There is nothing to register.${trailer}`;
  return unverified > 0
    ? `No error in this file breaks the specification. But we could not run ${unverified} check${unverified === 1 ? '' : 's'}, because we do not hold the reference data for ${unverified === 1 ? 'it' : 'them'}. Do not read this result as a clearance to submit.${trailer}`
    : `Each work has a total of 100% on each right. No party is duplicated, and no territory is claimed two times.${trailer}`;
}

/**
 * What happens to this file, in one sentence.
 *
 * States the consequence rather than the count: the count is already on screen beside it, and a
 * number is not an answer to "can I submit this". The three failing shapes are genuinely different
 * outcomes, so they get genuinely different sentences, and the classifier errs towards the milder
 * one: claiming a whole transmission is refused when it is not would send someone hunting a header
 * defect that does not exist.
 */
export function verdictLead(summary: CwrVerdictSummary): string {
  // `?? 0` covers a summary persisted before this field existed: the main claim stays right, and
  // only the trailing "a further N" clause is absent.
  const { ok, works, affectedWorks, fileFatal, unverified, warnings } = summary;
  const fileScoped = summary.fileScopedErrors ?? 0;
  if (ok) return passLead(Math.max(0, warnings - unverified), works, unverified);

  if (fileFatal) {
    // "None of the 1 work reaches" and "None of the 10 works reaches" are both wrong, and a count
    // is not worth a broken sentence, so the singular drops the count.
    const registersNothing =
      works === 1
        ? 'The society registers no work from this file.'
        : `The society registers none of the ${works.toLocaleString()} works in this file.`;
    return `The society refuses this file at the HDR record, before it reads a work. ${registersNothing} It sends no acknowledgement for a file in this condition, because it read no work to report on.`;
  }

  // `fileScoped` counts errors that belong to no single work: a duplicate submitter work #, a
  // sequence that does not increment. A "N of M works" sentence alone would silently drop them.
  // Agreement, not just the plural noun: "1 blocking issue apply" is the kind of sentence that
  // makes a reader distrust the arithmetic beside it.
  const issues = (n: number) => `${n.toLocaleString()} error${n === 1 ? '' : 's'}`;
  const applies = (n: number) => (n === 1 ? 'applies' : 'apply');

  if (affectedWorks === 0) {
    return `${issues(fileScoped)} in this file ${applies(fileScoped)} to the whole file, and not to one work. You cannot send one work again to correct this. Correct the file, and then send the file again.`;
  }

  // `affectedWorks` counts distinct transaction sequence numbers. A file whose sequence numbering
  // repeats is exactly the file this sentence appears on, so clamp rather than print "84 of 83".
  const affected = Math.min(affectedWorks, works);
  const clean = Math.max(0, works - affected);
  const rejected = `The society refuses ${affected.toLocaleString()} of the ${works.toLocaleString()} work${works === 1 ? '' : 's'} in this file`;
  // With file-scoped errors still open, "correct the works below and the society accepts the file"
  // is false: those errors belong to no work in the list, so correcting the list is not enough.
  // The two clauses used to sit side by side and contradict each other.
  if (fileScoped > 0) {
    const alsoFileScoped = `A further ${issues(fileScoped)} ${applies(fileScoped)} to the whole file, and not to one work.`;
    return clean > 0
      ? `${rejected}. It registers the other ${clean.toLocaleString()} work${clean === 1 ? '' : 's'}. ${alsoFileScoped} Correct the works below, and also that error, before you send the file again.`
      : `${rejected}. ${alsoFileScoped} In its present condition, this file registers no work.`;
  }
  return clean > 0
    ? `${rejected}. It registers the other ${clean.toLocaleString()} work${clean === 1 ? '' : 's'}. Correct the works below, and the society accepts the whole file.`
    : `${rejected}. In its present condition, this file registers no work.`;
}

/**
 * Compress a validation result to its verdict.
 *
 * Pure and total: safe to call on any result, and its output is what the history row persists.
 */
export function summariseValidation(result: CwrValidationResult): CwrVerdictSummary {
  const { ok, errors, warnings, transactionCount } = result;
  const unverified = [...errors, ...warnings].filter((i) => i.unverified);
  // A check that could not run is a statement about coverage, not a defect found in the file, so it
  // must not be counted among the categories a reader is being asked to act on.
  const realErrors = errors.filter((i) => !i.unverified);
  const realWarnings = warnings.filter((i) => !i.unverified);
  // Clamped for the same reason the sentence clamps it: transaction sequence numbers are data, and
  // a file that repeats or skips them is precisely the file this runs on.
  const affectedWorks = Math.min(worksAffected(realErrors), transactionCount);

  return {
    ok,
    errors: issueCount(errors),
    warnings: issueCount(warnings),
    works: transactionCount,
    affectedWorks,
    fileFatal: realErrors.some(isFileFatal),
    fileScopedErrors: issueCount(realErrors.filter(isFileScoped)),
    unverified: unverified.length,
    categories: categoryBreakdown(realErrors, realWarnings),
  };
}
