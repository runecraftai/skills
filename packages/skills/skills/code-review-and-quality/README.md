# code-review-and-quality

Multi-axis code review (correctness, readability, architecture, security, performance) with severity labels (Blocker, Required, Optional, Nit, FYI).

| Field | Value |
|-------|-------|
| Version | 1.0.0 |
| Trigger | `/review`, "code review", "PR review", "merge gate", "five-axis review" |
| PT trigger | `/revisar`, "revisão de código", "revisão de PR" |

**Do not use for** in-flight decisions on non-trivial work (that's `/harden`), single-line typo fixes, or when the user explicitly skips review.

See [SKILL.md](SKILL.md) for the full process.
