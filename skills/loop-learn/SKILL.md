---
name: loop-learn
description: >
  Appends phase outcomes to Flywheel memory so future phases learn from past work.
  Adapter over spec-driven's lessons layer and memory-management's flat-append format.
  Writes decisions (kept phases) to decisions.md and distilled failures to lessons.md,
  rooted at .flywheel/memory/. EN triggers: /loop-learn, record this outcome,
  save what we learned, log decision, capture lesson. PT triggers: /loop-learn,
  registrar resultado, salvar aprendizado, registrar decisão, capturar lição.
  Do NOT use for: spec-driven's own .specs/STATE.md or LESSONS.md (separate system),
  Guild projects (use guild-commit-learning), or writing the phase contract itself
  (use loop-contract).
license: CC-BY-4.0
---

# loop-learn

Thin adapter that records Flywheel phase outcomes to persistent memory. Reuses **spec-driven's lessons distillation** (failure → reusable guidance) and **memory-management's flat-append format** — this skill is a disciplined writer of two files, not a new memory engine.

```
JUDGE VERDICT → CLASSIFY → FORMAT → APPEND TO CORRECT FILE
```

---

## Overview

Flywheel's loop produces a judge verdict after every phase iteration. `loop-learn` takes that verdict and writes it to the right place in `.flywheel/memory/` so future phases (and future sessions) can consult past decisions and avoid repeating known failures.

Two files, one directory:

```
.flywheel/memory/
├── decisions.md    # what-we-chose ledger (every kept phase)
└── lessons.md      # what-to-avoid ledger (only grounded failures)
```

**Why two files:** `decisions.md` grows with every kept phase — the full audit trail of settled choices. `lessons.md` grows only on grounded failure — high-density, actionable guidance. Keeping them separate means `loop-contract` can load prior decisions cheaply without wading through failure narratives, and the failure signal stays sharp.

---

## When to Use

Write to `.flywheel/memory/` when:

- A phase completes with status `DONE` or `DONE_WITH_CONCERNS` — record the decision
- A phase fails with a grounded, concrete reason (gate failure, surviving sensor mutant, `BLOCKED`) — distill a lesson
- `loop-run` invokes you automatically after a judge verdict (the normal path)

Do **not** write when:

- The phase is still in-flight (no verdict yet — wait for the judge)
- The phase outcome is `NEEDS_CONTEXT` (pause, not a final outcome — no record)
- A clean `DONE` — records a **decision only**, never a lesson (no ceremony for successes, matches spec-driven's rule)

---

## Process

### Step 1: Classify the Verdict

Read the judge verdict from the current phase's run-log (`runs/<phase-id>.md`). Classify:

| Verdict | Action |
|---------|--------|
| `DONE` | Write a decision entry. Write **nothing** to lessons.md. |
| `DONE_WITH_CONCERNS` | Write a decision entry **with the concern field**. Write **nothing** to lessons.md. |
| Grounded failure (gate fail, surviving sensor mutant, `BLOCKED`) | Write a decision entry (status reflects the outcome). **Also** write a lesson entry. |
| `NEEDS_CONTEXT` | Do nothing — not a final outcome. |

### Step 2: Format the Decision Entry

Append to `.flywheel/memory/decisions.md` at the bottom (newest last). Use this exact format:

```markdown
## <phase-id> — <short title>
- date: <ISO date>
- decision: <what was chosen or what happened>
- rationale: <why — one or two lines>
- evidence: <file:line | command output | judge rationale>
- status: DONE | DONE_WITH_CONCERNS | BLOCKED
- concern: <only if DONE_WITH_CONCERNS — what to watch>
```

**Rules for good decisions:**
- **phase-id** matches the contract file name (e.g., `m1-p1`).
- **date** is ISO 8601 (e.g., `2026-07-25`).
- **decision** states the outcome concretely: "Implemented user auth with JWT + refresh tokens" not "Finished auth".
- **rationale** explains why this approach, not another one. An entry without rationale is just a log line.
- **evidence** is cited — never "seems right." Point at a file:line, a command exit code, or the judge's rubric output. If no evidence can be cited, flag it.
- **concern** only appears for `DONE_WITH_CONCERNS`. Be specific about what to watch (e.g., "token refresh not tested under network partition").

### Step 3: Distill a Lesson (only for grounded failures)

A **grounded failure** is: a gate that failed for a real reason, a surviving discrimination-sensor mutant, a `BLOCKED` outcome with a concrete blocker. These become reusable guidance in `.flywheel/memory/lessons.md`.

Append at the bottom using this exact format:

```markdown
## <phase-id> — <what went wrong>
- trigger: <the concrete failure — e.g., "gate passed but sensor mutant survived">
- root-cause: <why it happened>
- guidance: <the reusable rule — "when X, do Y / avoid Z">
- evidence: <cited source>
```

**Rules for good lessons:**
- **trigger** is the observable failure, not the symptom. "Database migration ran but 3 of 12 tables were empty" beats "Migration failed".
- **root-cause** traces the failure to its source. If the root cause is unclear, say "unknown — hypothesis: <best guess>" and flag it.
- **guidance** is a reusable, imperative rule for future phases. "When running SQLite migrations, verify row counts per table before marking DONE" beats "Be more careful with migrations".
- **evidence** ties the lesson to ground truth — a file:line, a command output, a judge rationale.
- **Only write lessons for grounded failures.** A clean `DONE` records nothing here. A `DONE_WITH_CONCERNS` records the concern in the decision entry, not as a lesson (unless the concern later materializes into a real failure).

This mirrors spec-driven's lessons distillation: `scripts/lessons.py` turns verification failures into reusable rules; `loop-learn` does the same at the roadmap-phase level.

### Step 4: Create Files on First Use

If `.flywheel/memory/` does not exist, create it and both files:

```bash
mkdir -p .flywheel/memory
[ ! -f .flywheel/memory/decisions.md ] && echo "# Decisions\n" > .flywheel/memory/decisions.md
[ ! -f .flywheel/memory/lessons.md ] && echo "# Lessons\n" > .flywheel/memory/lessons.md
```

Root output at `.flywheel/memory/`, never at `.agent-memory/` or `.specs/`.

### Step 5: Verify the Write

After appending:

- Read the entry back from the file to confirm it was written correctly
- Confirm the entry has all required fields (date, decision, rationale, evidence, status)
- Confirm a `DONE_WITH_CONCERNS` entry includes the `concern` field
- Confirm no lesson was written for a clean `DONE`
- Confirm no secrets, tokens, or credentials in the entry

---

## Adapter Contract

This skill is an **adapter**, not an engine. It does not:

- Run verification (that's `loop-judge`, which reuses spec-driven's verifier + discrimination sensor)
- Manage the run-log (that's `loop-run`)
- Re-implement memory management (that's `memory-management` — this skill reuses its flat-append format)
- Re-implement lesson distillation (that's spec-driven's `scripts/lessons.py` — this skill reuses the concept at phase granularity)

It **does**:

- Read the judge verdict from `runs/<phase-id>.md`
- Write disciplined entries to `.flywheel/memory/decisions.md` and `.flywheel/memory/lessons.md`
- Enforce the rule: clean success → decision only; failure → decision + lesson
- Ensure every entry carries cited evidence

---

## Example

### Input (from run-log)

```
## Outcome
phase: DONE_WITH_CONCERNS (after 2/3 iterations)
verdict: KEEP
evidence: judge scored 85/100; AC-3 edge case not tested (file: src/auth.test.ts:42)
```

### Output (decision entry)

```markdown
## m1-p2 — JWT auth with refresh tokens
- date: 2026-07-25
- decision: Implemented JWT-based authentication with rotating refresh tokens. Gate passed at 85/100 (LLM-judge).
- rationale: Chose RS256 over HS256 so external services can verify tokens without sharing the secret. Refresh rotation prevents stolen-token replay.
- evidence: judge scored 85/100 against AC-1..AC-4; src/auth.test.ts:42 — AC-3 (token expiry edge case) not exercised
- status: DONE_WITH_CONCERNS
- concern: Refresh-token rotation not tested under network partition; add as a follow-up phase if token theft is in threat model.
```

### Output (no lesson)

A `DONE_WITH_CONCERNS` is **not** a grounded failure — it records the concern in the decision entry and advances. No lesson is written unless the concern materializes into a real failure in a later phase.

### Input (grounded failure)

```
## Outcome
phase: BLOCKED (after 1/3 iterations)
reason: database migration deadlocked under concurrent writes; rollback applied
evidence: WAL checkpoint timed out at 30s (migrations/003.sql:12)
```

### Output (decision entry + lesson entry)

```markdown
## m2-p3 — Add notifications table
- date: 2026-07-25
- decision: Migration BLOCKED — WAL checkpoint deadlocked under concurrent writes. Rolled back.
- rationale: SQLite serializes writes; the migration ran while production traffic was active. Must drain writes before schema changes.
- evidence: WAL checkpoint timeout at migrations/003.sql:12
- status: BLOCKED
```

```markdown
## m2-p3 — Migration deadlocked under concurrent writes
- trigger: Migration ran while production writes were active; WAL checkpoint timed out at 30s
- root-cause: SQLite serializes write transactions. The migration held an exclusive lock while concurrent write requests queued, exhausting the WAL checkpoint timeout.
- guidance: When running SQLite migrations in production, drain external writes first (or use `BEGIN EXCLUSIVE` with a short timeout and retry). Verify zero concurrent writers before running DDL.
- evidence: migrations/003.sql:12; WAL checkpoint timeout log
```

---

## See Also

- `spec-driven` — Feature workflow with lessons layer (`scripts/lessons.py`) that this skill adapts to phase granularity
- `memory-management` — Flat-append format that this skill reuses for both decisions and lessons
- `loop-judge` — Produces the verdicts this skill records
- `loop-run` — Orchestrator that invokes this skill after each judge verdict
- `loop-contract` — Reads past decisions from `.flywheel/memory/decisions.md` to avoid re-litigating settled choices
