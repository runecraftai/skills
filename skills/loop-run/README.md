# loop-run

The Flywheel loop orchestrator. Drives a roadmap to completion by iterating phase-by-phase through the SELECT→APPLY→MEASURE→JUDGE→UNIFY loop, honoring risk-scaled sub-steps, autonomy mode, and per-phase budgets. Supports pause/resume across sessions and hosts via `.flywheel/state.md`.

| Field | Value |
|-------|-------|
| Version | 1.0.0 |
| Trigger | `/loop-run`, "run the next phase", "execute roadmap phase", "start the loop", "resume loop", "pause loop" |
| PT trigger | `/loop-run`, "executar próxima fase", "rodar loop", "retomar loop", "pausar loop" |

**Do not use for** generating roadmaps (`loop-roadmap`), writing contracts (`loop-contract`), judging work (`loop-judge`), or recording memory (`loop-learn`).

See [SKILL.md](SKILL.md) for the full process and decision flow.
