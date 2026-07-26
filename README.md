# record-cwr-validator

A CWR 2.2 reader and validator for Node, checked against CISAC **CWR19-1070** (Functional
specifications: Common Works Registration, Version 2.2 Revision 2).

Every rule names the section, page and severity it comes from. Most carry that citation in the
finding itself; the rest declare it at the rule, where one rule covers many fields and the precise
citation is per-field. Severities are the specification's own: **ER** entire file rejected, **GR**
group rejected, **TR** transaction rejected, **RR** record rejected, **FR** field rejected.

```ts
import { readFileSync } from 'node:fs';
import { validateCwr } from 'record-cwr-validator';

// Read as latin1, NOT utf8. CWR is a byte-oriented fixed-width format: every field sits at a byte
// offset from the start of its record. A UTF-8 decode collapses each multi-byte sequence into one
// character, and every field after it in that record is then read one byte early. Nothing reports
// an error, because the specification permits a record to be right-trimmed of its optional tail
// fields, so a short line is legal. The corruption is silent: you get wrong values, not a failure.
const report = validateCwr(readFileSync(path, 'latin1'));

if (!report.ok) {
  for (const issue of report.errors) {
    console.log(`[${issue.category}] L${issue.records.join(', L')}: ${issue.message}`);
  }
}
```

```
[header] L1: Sender identity "01234567846" is not in the CWR Sender ID and Codes Table, so it is
             not an approved CWR participant (CWR19-1070 §3.5 p14 field validations 3 and 12,
             ER: entire file rejected before any transaction is read).
```

## Presenting the findings

The loop above is fine for a handful of findings and unreadable past that, for two reasons worth
knowing before you build a report of your own.

**Count with `issueCount`, not `.length`.** Findings identical within a work arrive merged into one
entry carrying `occurrences`. `errors.length` is the number of entries, which is not the number of
findings: on one real submission it read 447 where there were 708.

**Group with `groupByRule`.** Most findings embed the offending value (`EAN "00031520" is not...`),
so no two are identical and nothing collapses. Printed one per line, a single rule broken ten times
becomes ten near-identical paragraphs, and the values, the only part you can act on, are buried
mid-sentence. `groupByRule` gathers findings that differ only in the value they name, masks the
value out of the rule, and lifts the specification citation out so it is stated once.

```ts
import { issueCount, groupByRule, formatCwrReport } from 'record-cwr-validator';

console.log(`${issueCount(report.errors)} issues, ${issueCount(report.warnings)} warnings`);

for (const group of groupByRule(report.errors)) {
  console.log(`${group.rule}  ×${group.total}`);
  if (group.citation) console.log(`  ${group.citation}`);
  for (const { values, issue, count } of group.instances) {
    console.log(`  ${values.join(' ')}  ${issue.workTitle ?? ''}  ×${count}  L${issue.records.join(', L')}`);
  }
}
```

`formatCwrReport(report, { source: filename })` renders the whole thing as text, complete and
untruncated, if you would rather not build one:

```
FIELD FORMATS (152)
------------------------------------------------------------------------------
  A field's format is invalid, such as an IPI Name Number that is not 9 to 11 digits.

  [WARN ] EAN "…" is not a valid European Article Number: it must be thirteen
          digits ending in a correct check digit.  ×152
          CWR19-1070 §5.21 p60 field validation 9, FR: the field is rejected
          "0000000000123"  A WORK TITLE  ×8  L10
```

**A pass is a pass over the checks that ran.** A finding carrying `unverified: true` is a check that
could not run because its reference data was not supplied, not a defect found in the file. See
*What it does not do* below. Say so in your own verdict: an unverifiable ER-severity check is not a
pass.

## Why this exists

CWR files are fixed-width and unforgiving, and societies differ in what they tell you when one
fails. A file can be refused with no acknowledgement and no rejection report, because a header-level
**ER** rule is evaluated before any transaction is read: so there is nothing to report on. Working
out which rule you broke, from silence, is expensive.

This library exists to turn that silence into a citation.

## The rule it follows

**A society's behaviour is a hypothesis. The specification settles it.**

That principle is load-bearing, and it cuts both ways. While building this we were told in writing
by a society that our files contained "unnecessary SPT lines". They were conformant: §5.7 states
that an SPT may carry all-zero shares "to record a publisher's place in the chain of agreements".
Encoding that complaint as a rule would have flagged correct files for every user of this library.

Equally, we had relaxed the ownership tolerance from CISAC's ±0.06% to ±0.075%, because a file with
that drift had once been accepted. That file breached the very rule being relaxed. Tuning a
validator to one accepted file measures the file, not the standard.

So: no rule ships without a citation, and no rule is added or loosened on the strength of what one
ingester happened to do.

## What it validates

Structural framing, envelope and trailer counts, record ordering, transaction and record sequence,
mandatory fields, field formats and coded lookups, IPI and ISWC check digits, per-right ownership
and collection totals, publisher/writer chain links, territory logic over the full CISAC TIS
hierarchy, and interested-party identity.

Records whose width does not match their record type are reported as framing defects, and
**field-level rules skip them**. Their field offsets are wrong by construction, so anything read out
of them would be an assertion about bytes rather than about data. The report states how many records
went unchecked rather than skipping them in silence.

## What it does not do

**Structural validity is not correct rights data.** A file naming the wrong publisher, or an IPI
that is wrong but has a valid check digit, still reconciles to 100% and passes every rule here. A
clean report means well-formed and submittable. It does not mean verified correct.

**Society-specific rules are out of scope by default.** CWR19-1070 §7 defines separate edits for
ABRAMUS/UBC, GEMA, Harry Fox, ICE, MusicMark, SACEM, SESAC, SGAE, SIAE and others. This library
implements the universal rules; the society-specific ones are opt-in and incomplete.

**Reference data is deliberately not integrated.** Several rules ask whether a value exists in a
register the file does not contain: whether an IPI Name Number is really assigned to that party,
whether an agreement number matches one on file with the acquiring society, whether a work has been
registered before. Thirteen rules need such data and three ask about submission history.

Public sources exist for some of it. The CWR Sender ID and Codes Table is downloadable from the
[CWR-DataApi project](https://cwr-dataapi.readthedocs.io/en/latest/cwr_standard/documents.html), and
free IPI lookup services are available. This package integrates none of them, on purpose: a
validator that reaches the network is a validator whose answer depends on someone else's uptime,
rate limit and data quality, and a third-party aggregate is not the authoritative register the rule
names. Supply your own data through the hooks and the checks run; supply nothing and they report as
unverifiable.

One rule family is approximated rather than skipped. Eleven rules require names and titles to use
the CIS character set, whose table is not published: CWR11-1494, which some indexes list as the
character set rules, is in fact the CWR User Manual, and states the list was still being compiled.
Printable ASCII is a strict superset, so the check flags what is certainly invalid and says what it
cannot see.

**The sender register is not included.** §3.5 p14 field validations 3, 5 and 12 require the Sender
ID to match the CWR Sender ID and Codes Table (CWR06-1972), which is a CISAC members-only document
we cannot redistribute. Supply it yourself:

```ts
import { setCwrSenderRegister } from 'record-cwr-validator';

setCwrSenderRegister({
  entries: [{ name: 'Example Music Ltd', code: 'EXM', ipi: '01234567846' }],
});
```

Without it those checks report **unverifiable**, at warning severity, rather than passing. An
ER-severity rule that could not run is not a pass.

## Licence

MIT: see [LICENSE](LICENSE).

Two data files are vendored from MIT-licensed sources and keep their original terms, recorded in
[THIRD-PARTY-LICENSES](THIRD-PARTY-LICENSES):

- CWR lookup tables, from [weso/CWR-DataApi](https://github.com/weso/CWR-DataApi). These are
  CWR 2.1-era, which is why an unrecognised code is a warning rather than an error: a stale list
  must not reject a valid 2.2 code.
- The CISAC TIS territory hierarchy, from
  [musicmetadata/territories](https://github.com/musicmetadata/territories).

CWR is a standard of [CISAC](https://www.cisac.org). This project is not affiliated with or endorsed
by CISAC. The specification itself is not redistributed here.
