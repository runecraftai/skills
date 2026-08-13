---
name: loop-judge
description: >
  Independent phase-level verifier for the Flywheel loop — a thin adapter over spec-driven's
  verifier + discrimination sensor, not a new engine. Enforces author≠verifier (fresh pass), runs
  the phase's declared gate (programmatic command or LLM-judge score 0-100), activates the
  discrimination sensor to catch self-approval, and emits a rich escalation status
  (DONE/DONE_WITH_CONCERNS/NEEDS_CONTEXT/BLOCKED) with cited evidence — evidence-or-zero, no
  citation means FAIL. Appends to `.flywheel/runs/{phase-id}.md` per the run-log template.
  Use when verifying a phase's work against its contract; never when applying changes
  (author≠verifier). Triggers (EN): `/loop-judge`, "verify this phase", "judge the change",
  "run the gate on this phase". Triggers (PT): `/loop-judge`, "verificar fase", "julgar mudança",
  "rodar o gate nesta fase". Do NOT use for applying changes, writing contracts, or generating
  roadmaps — use `/loop-run`, `/loop-contract`, or `/loop-roadmap` respectively.
license: CC-BY-4.0
metadata:
  version: 1.0.0
---

# loop-judge

Independent phase-level verifier for the Flywheel loop. **This is an ADAPTER over `spec-driven`'s verifier + discrimination sensor — not a new engine.** It reads a phase contract, runs the declared gate, and returns a cited, nuanced verdict that the loop orchestrator (`loop-run`) acts on.

```
CONTRACT ─► JUDGE ─► status + verdict + evidence ─► run-log ─► loop-run
              │
              ├─ gate: programmatic (cmd → exit/number) ─ OR ─
              ├─ gate: LLM-judge (score 0–100 vs BDD ACs)
              └─ sensor: spec-driven's discrimination sensor (anti-self-approval)
```

## Overview

Every phase in the Flywheel loop has a **contract** (`program.md`) that declares:

- **Acceptance Criteria** in BDD form (Given/When/Then)
- **Verify Method**: `programmatic` (a command with a baseline) or `llm-judge` (a rubric score against ACs)
- **Sensor**: on/off (discrimination sensor activation)
- **Impact**: internal | user-facing | business-facing

`loop-judge` reads this contract, runs the appropriate gate **as a fresh, independent pass** (author≠verifier), activates spec-driven's discrimination sensor when `sensor: on`, and produces a **rich escalation status** (not binary pass/fail) with **traceable cited evidence**.

## When to Use

| Trigger | Language |
|---------|----------|
| `/loop-judge` | EN, PT |
| `verify this phase`, `judge the change`, `run the gate on this phase` | EN |
| `verificar fase`, `julgar mudança`, `rodar o gate nesta fase` | PT |

**Do NOT use for:**
- Applying changes (use `loop-run` — author≠verifier)
- Writing contracts (use `loop-contract`)
- Generating roadmaps (use `loop-roadmap`)
- Learning/memory recording (use `loop-learn`)
- Spec-level task verification (use `spec-driven` directly)

## Process

### Step 1 — Load the Contract

Read the phase's contract file:

```
.flywheel/contracts/<phase-id>.md
```

Confirm the following fields exist and are well-formed:

- `kind: programmatic | llm-judge`
- `command:` (when `programmatic`)
- `judge_rubric:` (when `llm-judge`) — scoring rubric with PASS threshold
- `sensor: on | off`
- Acceptance Criteria (BDD form)

If the contract is missing, malformed, or ambiguous, emit **NEEDS_CONTEXT** with the specific gap — do not guess.

### Step 2 — Enforce author≠verifier

**The agent that ran APPLY must not run JUDGE.** This is a non-negotiable separation inherited from `spec-driven`'s verifier pattern.

- If this is a fresh agent session or invocation, confirm: no prior context from the APPLY step.
- If the same agent is attempting to judge its own work, refuse and return **BLOCKED** with the reason: "author≠verifier violation — judge must be a fresh pass."

This is not a soft guideline. The loop's trust model depends on it.

### Step 3 — Run the Gate

#### 3a. Programmatic Gate (`kind: programmatic`)

1. Execute the declared `command` in the workspace.
2. Capture:
   - **exit code** (0 = pass, ≠0 = fail)
   - **stdout/stderr output**
   - **numeric result** (if the command prints a number)
3. Compare the result to the baseline declared in the contract.
4. Derive `measure`: number vs baseline.
5. Gate passes when exit code = 0 AND the numeric result meets or exceeds baseline. Otherwise, REVERT.

#### 3b. LLM-Judge Gate (`kind: llm-judge`)

1. Load the contract's Acceptance Criteria (AC-1..N in BDD form).
2. Load the **judge_rubric** — the scoring dimensions (e.g., correctness, completeness, friction) and the **PASS threshold**.
3. Inspect the applied changes against each AC independently:
   - Verify with concrete evidence: `file:line`, test output, command result.
   - Do NOT rely on the author's claims — re-derive evidence independently.
4. Score **0–100** per the rubric. Derive `measure`: score vs PASS threshold.
5. Gate passes when score ≥ PASS threshold. Otherwise, REVERT.

### Step 4 — Activate the Discrimination Sensor

When the contract declares `sensor: on`, activate **spec-driven's discrimination sensor** (author≠verifier, evidence-or-zero):

1. Inject a **known-bad variant** of the change into scratch state (a mutation that should cause the gate to fail).
2. Re-run the gate against the mutant.
3. Observe: does the gate reject the mutant?

- **Sensor PASS**: the gate correctly rejects the known-bad variant → the gate is trustworthy.
- **Sensor FAIL**: the mutant survives → the gate is too weak or the change is untestable. The verifier result is **invalid** regardless of the measured score. Treat as FAIL.

**Do NOT re-specify the sensor mechanics.** This skill delegates to `spec-driven`'s verifier pattern. For the full sensor mechanics (mutation strategy, scratch state isolation, surviving-mutant handling), see `spec-driven`'s verifier documentation and the `verifier.md` reference in `loop-run/references/`.

### Step 5 — Emit Escalation Status

Derive a **rich escalation status** — never a binary pass/fail:

| Status | Condition |
|--------|-----------|
| **DONE** | All ACs met, gate passed, sensor passed (if on), evidence cited for every claim. |
| **DONE_WITH_CONCERNS** | ACs met and gate passed, but a concern surfaced: marginal score (within 10% of threshold), sensor near-miss, or evidence available but weak. Advance with a concern note attached. |
| **NEEDS_CONTEXT** | Cannot reach a verdict — missing information, ambiguous AC, or the gate requires input not yet available. Loop pauses; `loop-run` dispatches a discovery subagent. Does NOT count as a revert. |
| **BLOCKED** | Cannot proceed. Author≠verifier violation, sensor failure (mutant survives), gate unrecoverable, or scope violation detected. Phase is halted and escalated to human immediately regardless of autonomy mode. |

**`BLOCKED` is the only status that forces immediate escalation** — all others are actionable by the loop.

### Step 6 — Cite Evidence

Every verdict carries a **traceable citation**:

| Gate type | Evidence form |
|-----------|---------------|
| Programmatic | Command line + exit code + captured output + baseline comparison (`file:line` of test result, or raw stdout) |
| LLM-judge | Per-AC rationale tied to a concrete source (`file:line`, test output) + rubric dimension scores |
| Sensor | Mutant injected + gate result against mutant + conclusion |

**Evidence-or-zero:** if the judge cannot cite specific, traceable evidence for a verdict, the result is **FAIL** (score = 0, status = NEEDS_CONTEXT or BLOCKED depending on whether retrieval is possible). "Seems right" is not evidence.

### Step 7 — Append to Run Log

Write the iteration to the phase's run log:

```
.flywheel/runs/<phase-id>.md
```

Follow the **run-log template** (see `loop-run/references/run-log.md`). Each iteration entry includes:

```markdown
## Iteration <N>

- **hypothesis**: <the applied change, or null if first iteration>
- **diff-range**: <commit/range or file set touched>
- **measure**: <programmatic number | judge score> vs baseline <...>
- **status**: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
- **verdict**: KEEP | REVERT
- **evidence**: <cited source — file:line, command output, or judge rationale>
- **note**: <why — one sentence>
```

- **Append** to the existing log; never overwrite prior iterations.
- Include the `Outcome` section only on the final iteration (when phase is complete or escalated).
- Use the exact field names from the run-log template so `loop-run` can parse them.

## Example

**Phase `m1-p1`** — "POST /api/register returns 201 on success." Contract declares `kind: programmatic`, `command: "npm test -- register.test.ts"`, baseline exit code `0`, `sensor: on`, `impact: internal`.

1. **Load contract**: `.flywheel/contracts/m1-p1.md` — all required fields present and well-formed.
2. **Enforce author≠verifier**: this is a fresh judge invocation with no APPLY context. Proceed.
3. **Run the gate**: `npm test -- register.test.ts` → exit code `0`, all assertions pass.
4. **Activate sensor** (`sensor: on`): inject a known-bad mutant (drop the `201` status assertion) into scratch state, re-run the gate against it → gate correctly fails on the mutant. Sensor **PASS**.
5. **Emit status**: **DONE** — all ACs met, gate passed, sensor passed, evidence cited (`register.test.ts:42` assertion output).
6. **Append to run log**: write the iteration to `.flywheel/runs/m1-p1.md` with hypothesis, measure, `status: DONE`, `verdict: KEEP`, cited evidence, and a one-line note.

`loop-run` reads this entry and, per the decision flow, invokes `loop-learn` and advances to the next phase.

## Output Contract

After completing all steps, `loop-judge` emits:

1. **Status**: one of DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED
2. **Verdict**: KEEP | REVERT
3. **Measure**: the raw gate result (number or score)
4. **Evidence**: traceable citation for every claim
5. **Sensor result** (when `sensor: on`): PASS or FAIL
6. **Run-log entry** appended to `.flywheel/runs/<phase-id>.md`

The loop orchestrator (`loop-run`) reads these fields from the run-log and acts according to the decision flow in the plan (§14).

## Reuse

| Capability | Source |
|------------|--------|
| author≠verifier enforcement | `spec-driven` verifier pattern |
| Discrimination sensor | `spec-driven` verifier (mutation injection, scratch state, surviving-mutant detection) |
| evidence-or-zero | `spec-driven` verifier (traceable citations mandatory) |
| Run-log template | `loop-run/references/run-log.md` |
| Verifier contract | `loop-run/references/verifier.md` |
| Program contract format | `loop-run/references/program.md` |

This skill does not re-implement or re-specify how the discrimination sensor works, how mutations are injected, or how scratch state is isolated. Those mechanics live in `spec-driven`'s verifier. `loop-judge` is the **integration point** that applies `spec-driven`'s verifier at roadmap-phase granularity with Flywheel's escalation statuses and run-log format.
