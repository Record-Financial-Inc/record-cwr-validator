# What "100% conformance" can and cannot mean

CWR19-1070 carries **226** validation rules governing the record types in a work registration
(HDR, GRH, GRT, TRL, the work transaction, publishers, writers, their territories, PWR, ALT, PER,
REC, and the record prefix). Not all of them can be evaluated from a file.

| | Rules | |
|---|---:|---|
| Checkable from the file alone | 165 | Structure, sequencing, shares, links, cross-field consistency |
| Checkable with tables shipped here | 31 | Society codes, TIS territories, the CWR code tables |
| **Reachable ceiling** | **196** | |
| Need reference data nobody can distribute | 26 | See below |
| Assert state across submissions | 4 | Has this work been registered before? Is this work number unique in the submitter's system? |

**A validator working from a file cannot reach 226.** Thirty of those rules ask questions the file
does not contain the answer to. Claiming otherwise would mean either skipping them silently or
inventing an answer, and this engine does neither: an unevaluable rule reports as **unverifiable**,
never as a pass. An ER-severity check that could not run is not a pass.

## The 26 that need reference data

| Data | Rules | Why it cannot ship |
|---|---:|---|
| IPI database | 6 | Confirming a Name Number or Base Number exists and belongs to a publisher, writer or performer. Licensed CISAC data. |
| CIS character set table | 11 | The permitted characters for names and titles. Not published with the specification. **Partially checked** — see below. |
| CWR Sender ID and Codes Table | 3 | CWR06-1972, members-only. **Pluggable** via `setCwrSenderRegister`; unverifiable when absent. |
| Society agreement registers | 5 | Whether an agreement number matches one on file with the acquiring society. |
| BIEM/CISAC media type list | 1 | Permitted media types on a recording. |

### The character-set rules are approximated, not skipped

Eleven rules require names and titles to use only the CIS "Names" and "Titles" character sets. That
table is unavailable, but **printable ASCII is a strict superset of it**: every CIS character is
printable ASCII, and not every printable ASCII character is a CIS character.

Checking the superset is therefore a sound lower bound. Anything flagged is certainly outside the
CIS set, so there are no false positives; what it misses are characters that are printable ASCII yet
outside the CIS subset. Each finding states that limit rather than implying completeness.

## The four stateful rules

A work must not have been registered before; a submitter work number must be unique across the
submitter's system; a REV must follow a successful registration; a submitter recording identifier
must uniquely identify a recording. Each concerns the history of a catalogue, not the contents of a
file, and belongs to the system that tracks submissions.

## How severity is decided

A rule's severity is the specification's, not a judgement about how much the field matters:

| Spec | Meaning | Reported as |
|---|---|---|
| ER | Entire file rejected | error |
| GR | Group rejected | error |
| TR | Transaction rejected | error |
| RR | Record rejected — data the submitter meant to send is lost | error |
| FR | Field rejected — the registration proceeds without it | warning |

One deliberate exception. §5.7 record validation 1 (TR) requires an included territory to collect
above zero, while the §5.7 prose on the same page permits an all-zero record "to record a
publisher's place in the chain of agreements". The specification contradicts itself, so that finding
is a warning naming the conflict: erroring would block a shape the prose sanctions, and silence
would hide a rule societies implement.

Similarly §2.1 field validation 9 (ER) requires an exact record length, while real files right-trim
optional trailing fields and are ingested. Short records are reported at warning severity, citing
the rule's ER standing.
