# loop-learn

Records Flywheel phase outcomes to persistent memory. Adapter over spec-driven's lessons layer and memory-management's flat-append format — writes kept-phase decisions to `.flywheel/memory/decisions.md` and grounded failures to `.flywheel/memory/lessons.md`.

| Field | Value |
|-------|-------|
| Version | 1.0.0 |
| Trigger | `/loop-learn`, "record this outcome", "save what we learned", "log decision", "capture lesson" |
| PT trigger | `/loop-learn`, "registrar resultado", "salvar aprendizado", "registrar decisão", "capturar lição" |

**Do not use for** spec-driven's own `.specs/STATE.md` or `LESSONS.md` (separate system), Guild projects (use guild-commit-learning), or writing the phase contract itself (use loop-contract).

See [SKILL.md](SKILL.md) for the full process.
