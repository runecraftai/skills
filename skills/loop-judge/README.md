# loop-judge

Independent phase-level verifier for Flywheel — a thin adapter over `spec-driven`'s verifier + discrimination sensor. Runs the declared gate (programmatic or LLM-judge score 0-100), enforces author≠verifier, and emits a rich escalation status with traceable cited evidence.

| Field | Value |
|-------|-------|
| Version | 1.0.0 |
| Trigger | `/loop-judge`, "verify this phase", "judge the change", "run the gate on this phase" |
| PT trigger | `/loop-judge`, "verificar fase", "julgar mudança", "rodar o gate nesta fase" |

**Do not use for** applying changes (use `loop-run`), writing contracts (use `loop-contract`), or generating roadmaps (use `loop-roadmap`).

See [SKILL.md](SKILL.md) for the full process.
