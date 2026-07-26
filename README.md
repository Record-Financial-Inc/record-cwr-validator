# record-cwr-validator

A CWR 2.2 reader and validator for Node, checked against CISAC **CWR19-1070** (Functional
specifications: Common Works Registration, Version 2.2 Revision 2).

Every rule cites the section, page and severity it comes from. Severities are the specification's
own: **ER** entire file rejected, **GR** group rejected, **TR** transaction rejected, **RR** record
rejected, **FR** field rejected.

```ts
import { parseCwr, validateCwr } from 'record-cwr-validator';

const report = validateCwr(fileContents);

if (!report.ok) {
  for (const issue of report.errors) {
    console.log(`[${issue.category}] L${issue.records.join(', L')}: ${issue.message}`);
  }
}
```

```
[header] L1: Sender identity "01234567846" is not in the CWR Sender ID and Codes Table, so it is
             not an approved CWR participant (CWR19-1070 §3.5 p14 field validations 3 and 12,
             ER — entire file rejected before any transaction is read).
```

## Why this exists

CWR files are fixed-width and unforgiving, and societies differ in what they tell you when one
fails. A file can be refused with no acknowledgement and no rejection report, because a header-level
**ER** rule is evaluated before any transaction is read — so there is nothing to report on. Working
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

MIT — see [LICENSE](LICENSE).

Two data files are vendored from MIT-licensed sources and keep their original terms, recorded in
[THIRD-PARTY-LICENSES](THIRD-PARTY-LICENSES):

- CWR lookup tables, from [weso/CWR-DataApi](https://github.com/weso/CWR-DataApi). These are
  CWR 2.1-era, which is why an unrecognised code is a warning rather than an error: a stale list
  must not reject a valid 2.2 code.
- The CISAC TIS territory hierarchy, from
  [musicmetadata/territories](https://github.com/musicmetadata/territories).

CWR is a standard of [CISAC](https://www.cisac.org). This project is not affiliated with or endorsed
by CISAC. The specification itself is not redistributed here.
