# spec-loop

Milestone-loop runner: drives every `.specs/` artifact to completion — ROADMAP → milestones → tasks → verification gates → atomic commits → STATE.md.

| Field | Value |
|-------|-------|
| Version | 1.0.0 |
| Trigger | "execute the specs", "run the plan", "loop the milestones" |
| PT trigger | "executar as specs", "rodar o plano", "começar a executar", "siga o roadmap" |

**Use when** a tlc-spec-driven project has pending `tasks.md` items and you want autonomous execution, milestone by milestone, with verification gates and atomic commits.

**Do not use for** creating the plan itself — run [`spec-driven`](../spec-driven/README.md) first to produce the `.specs/` artifacts (ROADMAP.md, tasks.md, design.md, context.md), then hand execution to this skill.

## The loop

```
ROADMAP.md → pending milestones (M0..Mn)
  → feature tasks.md → atomic task
      → execute → verify ("Verificar:" criteria) → atomic commit → STATE.md
  → milestone gate (exit criteria) → next milestone
→ final spec.md acceptance (Success Criteria) → project done
```

One task at a time, in tasks.md order — never skip a "Depends on" edge. Verification runs for real: red means fix or stop, never advance. STATE.md is updated after every task.

## States

- `⬜ planned` → `▶️ in progress` → `✅ done` | `🛑 blocked` (reason + evidence)
- Milestone done only with green exit criteria; project done only with the spec.md final acceptance.

## Resume

Interrupted? Read STATE.md + recent commits → continue from the first non-done task. Never re-run tasks already done.

See [SKILL.md](SKILL.md) for the full process (rules, gates, escalation, delegation).
