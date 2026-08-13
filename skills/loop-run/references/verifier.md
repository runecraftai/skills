# Independent Verifier

The verifier is the **gatekeeper** of the loop. It answers one question: does the phase's work meet
the acceptance criteria declared in the contract? It does so without self-approval.

## Principles (inherited from `spec-driven`)

- **author≠verifier**: the agent that ran APPLY must not run JUDGE. The verifier is a fresh pass —
  either a fresh agent session (fresh context) or a dedicated `loop-judge` invocation.
- **discrimination sensor**: when `sensor: on`, the verifier injects a deliberately broken variant
  of the change and confirms the gate rejects it. If the variant survives, the verifier result is
  invalid and the gate is treated as FAIL regardless of the measured score. This is `spec-driven`'s
  anti-self-approval mechanism.
- **evidence-or-zero**: every verdict carries a traceable citation — `file:line`, command output, or
  judge rationale. If no evidence can be cited, the verdict is FAIL (score = 0).

## Verifier Contract

The verifier reads:

1. The phase's contract (`contracts/<phase-id>.md`) — what must be true.
2. The run-log so far (`runs/<phase-id>.md`) — what was attempted.
3. The current state of the workspace (files) — what actually changed.

It then produces:

- **measure**: the raw gate result (number or score).
- **sensor-result**: pass or fail (only when `sensor: on`).
- **verdict**: KEEP or REVERT.
- **status**: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED.
- **evidence**: cited source for every claim.

## Escalation Statuses

| Status | Meaning |
| --- | --- |
| **DONE** | All ACs met; sensor passed (if on); evidence cited. |
| **DONE_WITH_CONCERNS** | ACs met but a concern was surfaced (e.g., marginal score, sensor near-miss). Advance with a concern note. |
| **NEEDS_CONTEXT** | The verifier cannot reach a verdict — missing information. Loop pauses; discovery subagent gathers context; iteration retries. |
| **BLOCKED** | Cannot proceed. Phase is halted; human escalation is required regardless of autonomy mode. |

## Reuse

`loop-judge` is a thin adapter over `spec-driven`'s verifier + discrimination sensor + evidence-or-zero
pipeline. This file documents the contract, not the implementation. For the mechanics, see
`spec-driven`'s STATE.md and the verifier-reference in that skill.
