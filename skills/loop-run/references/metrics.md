# Metrics: Measure & Baseline Comparison

Each phase declares a **verify method** in its contract. The measure step runs the declared gate
against a **baseline** captured before the phase began. Comparison is always `current vs baseline`.

## Programmatic Gate (`kind: programmatic`)

A command that exits 0/≠0 or prints a numeric value.

- **Baseline capture**: run `command` before the phase starts; record exit code and stdout.
- **Measure**: run `command` after the phase's changes; record exit code and stdout.
  - Exit-code rule: `0` → gate passes; `≠0` → gate fails.
  - Numeric rule: if stdout is a number, gate passes when `current >= baseline` (or the contract may
    override direction with `stop_criterion`).
- **Evidence**: the full command output, cited as `command output: <first failing line>`.

## LLM-Judge Gate (`kind: llm-judge`)

A rubric scored 0–100 by an independent LLM pass (author≠verifier, discrimination sensor on).

- **Baseline capture**: run the judge against the pre-phase state; record baseline score.
- **Measure**: run the judge against the post-phase state; record score.
- **Pass threshold**: declared in the contract's `judge_rubric`; the sensor must also pass.
- **Evidence**: the judge's score + rationale, cited as `judge rationale: <excerpt>`.

## Sensor (Discrimination)

When `sensor: on`, the verifier injects a known-bad variant before judging. If the gate does not
reject it, the result is void and the gate result is treated as a FAIL regardless of the measured
score. This is `spec-driven`'s discrimination sensor — anti-self-approval.

## Judgment Rules

- **author≠verifier**: the measure step is run by a fresh agent pass, never the same session that
  performed APPLY.
- **evidence-or-zero**: if the judge cannot cite traceable evidence (file:line, command output, or
  rubric rationale), the score is 0.
- **no self-approval**: a judge that shares the APPLY session context is invalid; the result is
  `NEEDS_CONTEXT`.
