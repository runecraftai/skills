---
name: loop-run
description: >
  The Flywheel loop orchestrator — wires SELECT→APPLY→MEASURE→JUDGE→UNIFY, driving a roadmap
  to completion phase-by-phase per the contract's risk class, autonomy mode, and budget.
  Applies changes in-session (subagents are for discovery only), supports pause/resume across
  sessions and hosts via .flywheel/state.md, defaults to HITL confirmation each iteration
  (autonomous only for internal-impact phases), and reacts deterministically to each judge
  escalation status per the plan's decision flow.
  Use when running the loop engine, advancing roadmap phases, or resuming a paused loop.
  Triggers (EN): /loop-run, "run the next phase", "execute roadmap phase", "start the loop",
  "resume loop", "pause loop". Triggers (PT): /loop-run, "executar próxima fase",
  "rodar loop", "retomar loop", "pausar loop".
  Do NOT use for: generating roadmaps (loop-roadmap), writing contracts (loop-contract),
  judging work (loop-judge — author≠verifier), recording memory (loop-learn), or spec-level
  task execution (spec-driven).
license: CC-BY-4.0
metadata:
  version: 1.0.0
---

# loop-run

The Flywheel loop orchestrator. This is the **engine** that wires SELECT → APPLY → MEASURE → JUDGE → UNIFY, driving a roadmap to completion phase-by-phase. It is the conductor — it invokes the other `loop-*` skills, but does not itself generate roadmaps, write contracts, judge work, or record memory. Those are separate skills invoked at the right point in the loop.

```
SELECT phase → CONTRACT (if needed) → APPLY (in-session) → MEASURE → JUDGE → UNIFY
                                                                             │
                                                            ┌────────────────┘
                                                            ▼
                                              loop-learn → update state → advance or escalate
```

## Overview

`loop-run` reads a roadmap from `.flywheel/roadmap.md`, selects the next pending phase, ensures a contract exists (invoking `loop-contract` if needed), then executes the loop: apply the change, measure against the gate, submit to the independent judge, and unify the outcome into memory and state. It respects the phase's risk class to determine which sub-steps are mandatory, honors autonomy mode (default HITL, opt-in autonomous for internal-impact phases), and reacts deterministically to each judge escalation status.

The loop runs in-session for implementation work; subagents are reserved for discovery/research only. Pause and resume are pure file operations via `.flywheel/state.md`, enabling continuity across sessions and hosts.

## When to Use

| Trigger | Language |
|---------|----------|
| `/loop-run` | EN, PT |
| `run the next phase`, `execute roadmap phase`, `start the loop`, `resume loop`, `pause loop` | EN |
| `executar próxima fase`, `rodar loop`, `retomar loop`, `pausar loop` | PT |

**Do NOT use for:**
- Generating roadmaps (use `loop-roadmap`)
- Writing phase contracts (use `loop-contract` — `loop-run` invokes it only when a contract is missing)
- Judging/verifying work (use `loop-judge` — author≠verifier must be a fresh pass)
- Recording decisions or lessons (use `loop-learn`)
- Spec-level task execution or verification (use `spec-driven` directly)

## Prerequisites

Before invoking `loop-run`, confirm:

- `.flywheel/roadmap.md` exists with at least one pending phase
- `.flywheel/state.md` exists (or will be created on first run)
- The host environment has access to `loop-contract`, `loop-judge`, and `loop-learn` (installed as companion skills or available as slash commands)
- The host can read/write files in `.flywheel/`

## Reference Files

Load these only when the step at hand needs them — do not read all of them up front:

- **`references/program.md`** — the exact phase-contract file shape. Read when authoring a contract (Step 2) or when a contract's structure looks malformed.
- **`references/metrics.md`** — baseline-comparison mechanics for both gate kinds. Read during Step 4 (MEASURE) when defining or interpreting the gate's baseline.
- **`references/run-log.md`** — the run-log entry format. Read when appending an iteration (Step 5, Step 5.1-5.3) so field names match what `loop-judge` and `loop-learn` expect.
- **`references/verifier.md`** — full discrimination-sensor mechanics (mutation strategy, scratch-state isolation). Read before invoking `loop-judge` on a phase with `sensor: on`.
- **`references/example-run.md`** — a complete worked example of a two-phase loop run end-to-end. Read when unsure how the pieces fit together, or when onboarding a new host/agent to the loop.

## Process

### Step 1 — SELECT: Pick the Next Phase

1. Read `.flywheel/roadmap.md`. Identify the next **pending** phase (checkbox `[ ]` in the milestones section, ordered top-to-bottom within each milestone, milestone-by-milestone).
2. Read `.flywheel/state.md` to confirm the active phase (if resuming) or set it (if starting fresh).
3. If no pending phases remain, the roadmap is complete. Report completion and stop.

### Step 2 — CONTRACT: Ensure a Phase Contract Exists

Check for `.flywheel/contracts/<phase-id>.md`:

- **Exists and well-formed**: proceed to Step 3.
- **Missing or malformed**: invoke `loop-contract` to generate one from the phase's entry in the roadmap. Wait until the contract is written and valid before continuing.
- **Ambiguous scope or acceptance**: invoke `loop-contract` with the gap described; do not guess.

The contract declares the phase's risk class, scope (allowed files), BDD acceptance criteria, verify-method (programmatic or LLM-judge), impact, budget, and mandatory sub-steps. `loop-run` obeys every field — it does not override the contract.

### Step 3 — APPLY: Execute the Phase (In-Session)

Implement the change **in-session** with managed context. This is the implementation step; `loop-run` or the agent it delegates to edits only the files listed in the contract's **Scope (allowed files)**. Any file outside this list is out of scope and must not be touched.

**Subagents are reserved for discovery/research only (§13.3).** Do not use subagents for applying changes. Implementation work always runs in-session to avoid context rot and ~70%-quality subagent output that needs cleanup. Subagents may only be used in Step 5.2 (NEEDS_CONTEXT → discovery subagent) to gather information — not to write code.

**Risk-scaled mandatory sub-steps (§13.4):** the phase's risk class governs which steps are mandatory. The loop must always include at least the steps declared for the risk class:

| Risk class | Mandatory sub-steps | Skippable |
|------------|---------------------|-----------|
| **tiny-fix** | apply → measure → judge | contract, learn |
| **standard** | contract → apply → measure → judge → learn | — |
| **risky** | contract → apply → measure → judge (sensor forced) → learn → human sign-off | — |

`Impact != internal` ⇒ risk class `risky` ⇒ forced HITL regardless of autonomy mode. Respect this rule: non-internal impact forces human-in-the-loop.

### Step 4 — MEASURE: Run the Gate

Run the verification gate declared in the contract:

- **Programmatic gate** (`kind: programmatic`): execute the contract's `command`, capture exit code and output, compare against baseline.
- **LLM-judge gate** (`kind: llm-judge`): delegate to `loop-judge` for a rubric-based score against the BDD acceptance criteria.

The measurement (number, score, exit code) is recorded in the run-log for the judge to act on. `loop-run` initiates the gate but the final verdict comes from the judge.

### Step 5 — JUDGE: Invoke the Independent Verifier

Invoke `loop-judge` as a **fresh, independent pass** (author≠verifier). The agent that ran APPLY must not run JUDGE — this is non-negotiable.

`loop-judge` reads the contract, runs the gate (programmatic or LLM-judge), activates the discrimination sensor when declared, and emits one of four escalation statuses with a verdict (KEEP/REVERT) and cited evidence. The status is written to `.flywheel/runs/<phase-id>.md`.

### Step 5.1 — Decision Flow: React to Judge Status

Each iteration produces exactly **one** judge status. `loop-run` reacts deterministically:

| Judge status | Verdict | `loop-run` action | Consumes budget? |
|--------------|---------|-------------------|-------------------|
| **DONE** | KEEP | Invoke `loop-learn` (record decision). Mark phase complete in `roadmap.md` and `state.md`. **If risk class is `risky`**: require human sign-off before advancing. Otherwise, advance to next phase. | No |
| **DONE_WITH_CONCERNS** | KEEP | Invoke `loop-learn` (records the concern as a lesson). Mark phase complete, advance to next phase. In `hitl` mode: show the concern to the human before advancing. | No |
| **NEEDS_CONTEXT** | (no verdict) | **Pause the phase.** Invoke a **discovery subagent** (§13.3) to gather missing context. Append findings to the run-log. Retry the iteration with added context. Does **not** revert. | Yes |
| **BLOCKED** | REVERT | **Revert the change.** Write a `BLOCKED` outcome to the run-log with the cited blocker. **Escalate to human immediately** regardless of autonomy mode. Loop stops for this phase. | Yes |

**Plain gate-fail REVERT** (not BLOCKED): the change simply failed the gate — retry within `max_iterations` budget. When the budget is exhausted without a KEEP, the phase outcome becomes `ESCALATED` and control returns to the human. The loop never silently gives up and never loops forever.

**Risk gate before advance:** for a `risky` phase, even a `DONE` requires **human sign-off** before `loop-run` advances. The machine verdict is necessary but not sufficient when impact is user/business-facing.

### Step 5.2 — NEEDS_CONTEXT: Discovery Subagent

When the judge returns `NEEDS_CONTEXT`, the phase is paused (does not advance, does not revert). `loop-run` gathers missing context via a **discovery subagent** — not in-session implementation — and appends findings to the run-log. The iteration retries with the added context, consuming one budget unit.

Discovery subagents may search the codebase, research external APIs, read documentation, or fetch missing requirements — but they do not modify code.

### Step 5.3 — BLOCKED: Immediate Escalation

When the judge returns `BLOCKED`, the phase is halted:

1. Revert the applied change to the pre-iteration state.
2. Write the BLOCKED outcome (with status, blocker, and cited evidence) to the run-log.
3. **Escalate to the human immediately** — regardless of autonomy mode. The loop stops for this phase.
4. Update `state.md` to reflect: phase is blocked, no further iterations are attempted.

### Step 6 — UNIFY: Record and Advance

After a KEEP verdict (DONE or DONE_WITH_CONCERNS):

1. **Invoke `loop-learn`** to append the outcome to `.flywheel/memory/decisions.md` (and `.flywheel/memory/lessons.md` if a grounded failure).
2. **Update state**: mark the phase checkbox `[x]` in `roadmap.md`, update `.flywheel/state.md` with the new position (next phase, or "roadmap complete").
3. **Advance**: select the next pending phase (return to Step 1).

After a `BLOCKED` or `ESCALATED` outcome: stop the loop for this phase. Update `state.md` with the escalation reason. Do not advance.

## Autonomy Modes

`loop-run` respects the autonomy mode declared in `roadmap.md`:

| Mode | Behavior |
|------|----------|
| **hitl** (default) | Confirm each iteration with the human before proceeding. Show DONE_WITH_CONCERNS concerns before advancing. |
| **autonomous** | Run within budget without per-iteration confirmation. **Force HITL** when the phase contract declares `impact: user-facing` or `impact: business-facing` (see Step 3). |

The per-phase budget comes from the contract's `max_iterations` field (default 3, mirrors `spec-driven`'s bounded loop). Autonomous mode does not mean unlimited — when budget is exhausted, the phase escalates.

## Pause and Resume (§15)

Pause and resume are **pure file operations** — not a runtime feature.

### Pause

Triggered by `/loop-run pause` or context-window pressure:

1. Write the current position to `state.md`:
   - Active `phase-id`
   - Current iteration number
   - Autonomy mode
   - Budget remaining
2. Ensure the run-log for the active phase is flushed.
3. Any in-flight, unjudged change is either committed as a checkpoint or reverted — never left ambiguous.

Pause writes no new runtime state; the `.flywheel/` directory is the only source of truth.

### Resume

Triggered by `/loop-run resume` (in the same or a different session/host):

1. Read `.flywheel/state.md` for the active `phase-id`, iteration, mode, and budget.
2. Read `.flywheel/contracts/<phase-id>.md` for the phase contract.
3. Read `.flywheel/runs/<phase-id>.md` for the iteration history.
4. Reconstruct position: continue from the next un-started iteration within the phase.
5. Resume works across **different hosts** (pause in Cursor, resume in Claude Code) because state lives entirely in `.flywheel/`.

### Source of Truth on Conflict

If `state.md` and the run-log disagree (e.g., crash mid-write):

- **Run-log is authoritative for history.** Trust the run-log's last complete iteration.
- **Rewind `state.md`** to match the run-log's actual position.
- `loop-run` must detect the mismatch, log it, and repair before continuing.

## Loop Orchestration Summary

```
┌──────────────────────────────────────────────────────────────────┐
│                    loop-run orchestration                         │
│                                                                   │
│  SELECT → CONTRACT → APPLY → MEASURE → JUDGE → UNIFY             │
│    │         │         │        │         │        │              │
│    │     invoke       in-     run     invoke    invoke            │
│    │     loop-      session   gate    loop-    loop-              │
│    │    contract              per     judge    learn              │
│    │                          contract                            │
│    │                                                              │
│    └─ JUDGE STATUS → DECISION FLOW (§14)                          │
│         ├─ DONE ────────────────► learn ─► [risky? sign-off] ─► advance
│         ├─ DONE_WITH_CONCERNS ──► learn(+concern) ─► advance      │
│         ├─ NEEDS_CONTEXT ───────► discovery subagent ─► retry     │
│         └─ BLOCKED ─────────────► revert ─► escalate (stop)       │
│                (plain gate-fail REVERT ─► retry ─► else ESCALATED)│
└──────────────────────────────────────────────────────────────────┘
```

## Files Touched

| File | Read/Write | Purpose |
|------|-----------|---------|
| `.flywheel/roadmap.md` | Read + Write | Select pending phase, mark complete |
| `.flywheel/state.md` | Read + Write | Track position, mode, budget; pause/resume |
| `.flywheel/contracts/<phase-id>.md` | Read | Phase scope, acceptance, gate, risk, budget |
| `.flywheel/runs/<phase-id>.md` | Append | Iteration history (judge verdicts, evidence) |
| `.flywheel/memory/decisions.md` | Append (via loop-learn) | Kept decisions |
| `.flywheel/memory/lessons.md` | Append (via loop-learn) | Distilled failures |

## Reuse

| Capability | Source |
|------------|--------|
| Phase contract generation | `loop-contract` (invoked when contract is missing) |
| Independent verifier + discrimination sensor | `loop-judge` (invoked as fresh pass, author≠verifier) |
| Memory recording (decisions + lessons) | `loop-learn` (invoked after KEEP verdict) |
| Roadmap creation | `loop-roadmap` (invoked before loop-run if no roadmap exists) |
| Bounded loop budget (default 3 iterations) | `spec-driven`'s fix→re-verify loop pattern |
| Decision flow + escalation statuses | Flywheel plan (§14) |
| Pause/resume contract | `.flywheel/state.md` + run-log (§15) |
| Risk sub-steps | Flywheel plan (§13.4) |

This skill is the **orchestrator** — it does not implement judging, learning, contracting, or roadmap generation. It delegates those responsibilities to the appropriate skills and enforces the decision flow, autonomy rules, and pause/resume contract.
