---
name: verified-implementation
description: >
  Implements work already planned: extracts a checklist of named proofs from a planned work item,
  builds it, and proves every check with an independent verifier (author != verifier). Use when
  the user says "extract a checklist", "build this ticket", "implement this spec", "implement
  this", or "verified implementation". Do NOT use when nobody has decided what to build (use
  idea-discovery), to design the work (use task-cutting), or for general coding without a planned
  artifact.
license: CC-BY-4.0
metadata:
  version: 1.0.0
  author: Tech Leads Club - github.com/tech-leads-club
  upstream: "tech-leads-club/agent-skills (CC-BY-4.0, Copyright Tech Leads Club)"
---

# Verified Implementation

Extract the checks. Build. Prove each one, independently.

```
EXTRACT ─────────→ BUILD ─────────→ VERIFY
(one checklist)    (your call)      (fresh agent)
```

The thinking already happened somewhere else. Your job is to lose nothing from it, then prove what you built. **How** you build is yours — no phases, no task list, no step-by-step.

## When to Use

- A task, PRD, RFC, or design doc describes what to build and you need to implement it
- The user says "build this ticket", "implement this spec", or "extract a checklist"
- Work has been planned and you need to prove every check independently
- You need a fresh-context verifier to confirm the implementation matches the plan

## Profile

The project chooses how much of this runs, in its `AGENTS.md` or equivalent:

```markdown
## verified-implementation

profile: standard
handoff: on
```

`profile` is `light`, `standard`, or `ui`. `handoff` is `on` or `off` (default `on`). A batch packs whole slices up to **150k tokens** of estimated reading.

| Profile | Adds | Cannot catch |
|---|---|---|
| `light` (default) | proofs batched at HEAD, each named test shown to exist and run, one located assertion per check, level and sampling gaps, `Swept existing` re-read | a set member with no proof; a test that would pass under a wrong implementation |
| `standard` | the `Coverage` join, `Test policy` rows with a verdict each, one fault per assertion surface | a check that contradicts the design; a screen nobody built |
| `ui` | binding sources opened and compared, per-screen enumeration of copy and arrangement, the designed-screens row | only spacing, colour and type weight |

Each step adds a class of failure detected. Read `references/test-policy.md` when writing Coverage and Test policy rows under `standard` or `ui`. Under `light` skip that file. Under `ui` also read `references/screens.md`.

**A step whose input is empty costs a line, not a pass.** Say "no set rows" and move on. The profile is a floor and not a secret — the verification report names it.

`handoff: on` (default) governs the build: `off` keeps the whole build in one agent. The Verifier is always a separate agent.

## Critical rules

1. Every check names its **proof** — the test or command whose exit code settles it. No proof, no check.
2. Tests assert what the checklist says, never what the code happens to do.
3. Never weaken an assertion, delete a test, or skip one to make a suite pass.
4. The checks and test-policy rows do not change while you build.
5. The **Verifier is a fresh sub-agent**, never the author, never optional. Dispatched after the **last batch** has landed.
6. **Blast radius:** an approved checklist authorises local edits and commits. `git push`, deploy and production data changes need explicit go-ahead.

## Extract

Read the source completely first — ticket, PRD, RFC, thread. Then walk the codebase around what it touches.

**Refuse rather than guess.** Three things must be true before writing the checklist:

- Every claim has a **nameable proof** — if you cannot say which test settles it, it is too vague
- Every claim has a **concrete value** — never "gracefully", "properly" or "fast"
- The boundary is stated — you can say what is explicitly out

**Sweep for what the source does not mention.** Nine dimensions, one line each: validation, failure modes, idempotency and retry, authorization, concurrency and ordering, data lifecycle, external-dependency failure, state transitions, observability. Raising one is free; growing scope is the user's call.

Read `references/checklist-format.md` when writing `.checks/<feature>.md`.

## Build

You decide how. Write the tests from the checklist, implement, run each proof, commit in coherent pieces.

New capability nobody asked for and unrelated refactors are not yours to add. Everything else inside the work at hand is the work.

Doors get discovered while building — decide, then record: append the row to `Landing` with its literal shape and the alternative rejected, **before the code that closes it is written**.

A red proof is a stop, not a note. If a check turns out wrong or impossible, stop and renegotiate.

### Handoff

When `handoff: on`, batch by token budget: **accumulate whole slices while the running total stays under 150k tokens**. Write the intended split into the checklist under `## Handoff` with the arithmetic.

Handoff carries three lines: where the boundary fell and the commit, what the user settled mid-build, and what was abandoned. Only on green, with every proof passing.

When `handoff: off`, one agent, compaction, and re-reading the checklist and diff before continuing.

## Verify

When the last commit lands, dispatch the Verifier automatically. See `references/verify.md`. The work is not done at the last commit; it is done when the Verifier's report accounts for every check.

**"After the last commit" means the last one of the feature, not of your batch.** A build agent finishes, reports, and stops. Verification is the orchestrator's step: it waits for the last batch, then dispatches one agent over `<feature base>..HEAD` with every check.

## Output

Produce the artifact; do not narrate the phase. Lead with the verdict. State decisions definitively.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "A suite going green is enough" | Name a specific test. A suite says nothing about this claim. |
| "I'll verify my own work" | The author cannot check their own work. A fresh Verifier is never optional. |
| "This test covers it" | The assertion must target the checklist-defined value, not merely exist. |
| "Skip the sweep — this is simple" | Concurrency and observability hide in simple code too. Walk all nine. |

## Red Flags

- A proof that names a whole suite instead of a specific test
- The author dispatching their own Verifier
- A test written from the implementation instead of the checklist
- Checks changing mid-build to match what was easy to implement
- A handoff boundary splitting a slice mid-outcome
- Verification scoped to the last batch instead of the whole feature

## Verification

After implementation:

- [ ] Every check has a named proof that was run and passed
- [ ] The Verifier is a fresh agent, not the author
- [ ] The Verifier report accounts for every check in the checklist
- [ ] No assertions were weakened to make the suite pass
- [ ] Landing rows were recorded before the code that closed them
- [ ] The diff range covers the entire feature, not just the last batch

## See Also

- `task-cutting` — produces the planned work item this skill implements
- `idea-discovery` — produces the design document that feeds into planning
- `test-driven-development` — the RED/GREEN/REFACTOR cycle for writing tests
- `source-driven-development` — grounding decisions in official documentation
