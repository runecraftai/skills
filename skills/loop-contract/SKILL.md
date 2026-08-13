---
name: loop-contract
description: >
  Read the next pending phase from `.flywheel/roadmap.md` and produce a scoped
  `.flywheel/contracts/{phase-id}.md` contract matching the `program.md` template.
  The contract is the single source of truth the loop obeys for one phase — it declares
  allowed files, BDD acceptance criteria, verify method, risk class, mandatory sub-steps,
  impact level, and budget. Triggers (EN): `/loop-contract`, "create phase contract",
  "scope this phase". Triggers (PT): `/loop-contract`, "criar contrato da fase",
  "escopo da fase". Do NOT use for roadmap generation (use loop-roadmap) or phase
  execution (use loop-run).
license: CC-BY-4.0
---

# loop-contract

Turn the next roadmap phase into a scoped, machine-readable contract that the loop obeys.

```
┌──────────┐     ┌───────────┐     ┌──────────┐
│ READ     │ ──► │ AUTHOR    │ ──► │ WRITE    │
│ roadmap  │     │ contract  │     │ contract │
└──────────┘     └───────────┘     └──────────┘
```

## What It Does

`loop-contract` reads `.flywheel/roadmap.md`, selects the next pending phase (first unchecked phase in milestone order), and writes a scoped `.flywheel/contracts/<phase-id>.md` file. The contract is the **single source of truth** the loop-run engine obeys for one phase — every guardrail (scope, acceptance, gate, impact, budget) lives in plain markdown the user or agent can read and edit.

## When to Use

- After `loop-roadmap` has produced or loaded a roadmap
- Before `loop-run` executes a phase — the contract must exist first
- When the user wants to review or tighten the scope of a specific phase before execution
- When re-scoping is needed after a BLOCKED or ESCALATED outcome

## Process

### 1. Read the Roadmap

Open `.flywheel/roadmap.md`. Find the first unchecked phase (`- [ ] P<N>`) in milestone order. Extract:

- `phase-id` (e.g., `m1-p1`)
- `title`
- `risk` class declared on the phase line (e.g., `risk: standard`)

If no unchecked phase remains, report that the roadmap is complete and stop.

### 2. Infer Risk Class

The `risk` field on the phase line in `roadmap.md` is authoritative. If absent, infer from context:

- **tiny-fix** — single file, no new abstractions, no API change, no data model change
- **standard** — multiple files, new modules or patterns, measurable acceptance criteria
- **risky** — architectural change, user-facing behavior, business-facing logic, data migration, external dependencies

When `impact` is `user-facing` or `business-facing`, force `risk: risky` regardless of the roadmap declaration.

### 3. Author the Contract

Write `.flywheel/contracts/<phase-id>.md` with these sections:

#### Risk Class

The `risk` class governs which sub-steps are mandatory during execution (§13.4):

| Risk class | Mandatory sub-steps |
|---|---|
| **tiny-fix** | apply → measure → judge |
| **standard** | contract → apply → measure → judge → learn |
| **risky** | contract → apply → measure → judge (sensor forced) → learn → human sign-off |

#### Objective

One sentence describing what this phase must achieve. Concrete and measurable.

#### Scope (Allowed Files)

A glob or path list. `loop-run` may **only** edit files matching these patterns. Anything else is out of scope. Be explicit: prefer paths over globs when the set is small; use globs when a well-known directory structure applies.

Example:
```
- src/commands/loop-contract.ts
- skills/loop-contract/**
- tests/loop-contract.test.ts
```

#### Out of Scope

Explicit files, directories, or concerns the phase must **never** touch. This is the guardrail that prevents scope creep.

#### Acceptance Criteria (BDD)

Written in Given/When/Then format, numbered AC-1, AC-2, ... per §13.2. Each criterion must be observable and checkable — no "seems right" outcomes.

Example:
```
- AC-1:
    Given a roadmap with at least one unchecked phase
    When  loop-contract runs
    Then  the next pending phase is selected in milestone order
- AC-2:
    Given a selected phase with risk class and impact
    When  the contract is authored
    Then  all mandatory sub-steps for that risk class are written into the contract
```

#### Verify Method

Declares how the gate measures success:

- **kind**: `programmatic` or `llm-judge`
- **command** (when kind=programmatic): a shell command that exits 0 for pass, non-zero for fail, or prints a numeric result
- **judge_rubric** (when kind=llm-judge): rubric text; score 0–100 against AC-1..N; specify the PASS threshold
- **sensor**: `on` (discrimination sensor from spec-driven — anti-self-approval; forces at least `on` for risky phases)

#### Impact

One of: `internal` | `user-facing` | `business-facing`.

Non-internal impact forces `risk: risky` and forced HITL (human-in-the-loop). This gates autonomy — autonomous mode is only allowed for `internal` phases.

#### Mandatory Sub-Steps

Expanded from the risk class (§13.4). Written as an explicit checklist so `loop-run` knows exactly which steps to execute.

#### Budget & Stop

- **max_iterations**: default 3 from roadmap's `budget_per_phase`; override if the phase warrants fewer or more
- **stop_criterion**: when to stop even if not perfect (e.g., "no further measurable improvement after 3 iterations", "human sign-off required regardless of score")

### 4. Contract Template

The output file follows this exact shape:

```markdown
# Phase Contract: <phase-id> — <title>

risk: <tiny-fix | standard | risky>

## Objective
<one sentence>

## Scope (allowed files)
- <glob or path>

## Out of Scope
- <explicit exclusion>

## Acceptance Criteria (BDD)
- AC-1:
    Given <precondition>
    When  <action>
    Then  <observable outcome>
- AC-2:
    Given <precondition>
    When  <action>
    Then  <observable outcome>

## Verify Method
kind: <programmatic | llm-judge>
command: "<cmd>"                                    # when kind=programmatic
judge_rubric: |                                     # when kind=llm-judge
  score 0–100 against AC-1..N; PASS threshold: <n>
sensor: <on | off>

## Impact
impact: <internal | user-facing | business-facing>

## Mandatory Sub-Steps
- [ ] contract
- [ ] apply
- [ ] measure
- [ ] judge
- [ ] learn
- [ ] human sign-off  # only for risky

## Budget & Stop
max_iterations: <n>
stop_criterion: "<criterion>"
```

## Edge Cases

- **No unchecked phase**: report "roadmap complete" and exit — do not create a contract
- **Missing risk in roadmap**: infer from phase context; if ambiguous, default to `standard`
- **Non-internal impact declared**: force `risk: risky` and flag in the contract output
- **Phase with no title**: derive a title from the phase-id and surrounding milestone context
- **Roadmap not found**: report that `loop-roadmap` must run first — do not fabricate a roadmap

## Context Loading Strategy

Load only what is needed for the current contract:
- `.flywheel/roadmap.md` — the phase list
- `.flywheel/state.md` — current position and autonomy mode
- `.flywheel/memory/decisions.md` — prior kept choices to avoid re-litigating settled decisions
- Target: keep context under 20k tokens for contract authoring
