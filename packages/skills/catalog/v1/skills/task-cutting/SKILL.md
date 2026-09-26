---
name: task-cutting
description: >
  Turns already-decided work (a PRD, design doc, RFC, or thread) into tasks a builder can act on
  without guessing: slices that each prove something, grounded in the code, with intent, observable
  criteria carrying concrete values, the boundary, what the change disturbs, and only the
  hard-to-reverse decisions. Walks every surface the work exposes and sweeps nine
  unwritten-requirement dimensions. Use when the user says "write the task", "cut this PRD into
  tasks", "turn this design doc into work", "break this into tasks", or "task cutting". Do NOT use
  for discovery itself (use idea-discovery — a one-line ticket is a decision; a blank wish is not)
  or to implement (use verified-implementation).
license: CC-BY-4.0
metadata:
  version: 1.0.0
  author: Tech Leads Club - github.com/tech-leads-club
  upstream: "tech-leads-club/agent-skills (CC-BY-4.0, Copyright Tech Leads Club) packages/skills-catalog/skills/(development)/tlc-plan @ v0.2.0"
---

# Task Cutting

Cut the source. Ground it in the code. Write the task.

```
CUT ──────────→ GROUND ──────────→ WRITE
(slices, then   (the repository     (one task,
 how many        it lands in)        unless a seam
 tasks)                              is forced)
```

Someone already decided what to build. A one-line ticket counts; a blank "we should do something about billing" does not. This turns that decision into work a builder can pick up without guessing, and stops at the first thing nobody decided. It finds the operational hole the source left implicit by walking two fixed lists, not by inventing a feature.

## When to Use

- A design doc, PRD, RFC, or thread describes what to build and you need tasks
- The user says "write the task" or "cut this into work"
- Work has been decided but nobody has broken it into verifiable slices
- You need to ground a plan in the actual codebase before handing it off

## Critical rules

1. Every criterion is an **observable outcome with a concrete value**. "The columns exist" is not a criterion.
2. **Refuse rather than guess.** A gap in the source comes back as a question.
3. `Decided` carries only what is hard to reverse. Everything reversible is decided while building.
4. Raising a concern is free; growing scope is the user's call.
5. When the source contradicts the code, **amend the source**.
6. The task is the record of decision. Linked documents keep the reasoning.

## Cut

Read every source completely first. Then enumerate the slices and only after that decide how many tasks they become.

**A slice is one observable outcome, never a layer.** "Schema first, then endpoints" produces pieces nobody can verify alone.

**Default to one task for the whole source.** Split only when: a piece cannot land before another without breaking production, a piece waits on an answer only someone else can give, or a piece belongs to another team. Six slices with no doors is safe whole; three slices with four doors and a migration is not.

When big, show the seams — order constraints first, then thematic groupings with reasons. Let the user pick where to cut.

## Ground

Now open the repository. Three things only the code answers:

- **What the change disturbs.** Which existing term changes meaning, and who depends on it today.
- **Which decisions are actually one-way.** You cannot tell a new pattern from an ordinary one without reading conventions.
- **Where the source is simply wrong.** Names the system does not use, APIs that do not exist.

What you do **not** settle here is placement — the repository's conventions answer most of it and the rest is reversible.

## Walk the surfaces

A surface is anything outside the system that meets it. Each kind carries the same decisions every time:

| Surface | The decisions it always has |
| --- | --- |
| screen or view | empty, loading, error, unauthorised states; density and ordering; destructive action confirmation |
| API or webhook | response shape, error shape with codes, who may call it, versioning, rate limit behaviour |
| command or scheduled task | output format, every flag and default, exit codes, failure output |
| document or copy | structure, tone, depth, what the reader does next |
| collection being organised | grouping criterion, naming, ordering, duplicates, the exception |

**The walk finds gaps. It does not write criteria.** Each item resolves to a criterion **already in the source or already written from it**, to something the code already does (`existing - <what>`), to `n/a - <reason>`, or to `Unresolved <n>`. The `n/a` escape is mandatory and it is what stops the list from inventing scope: a webhook has no empty state, and saying so costs a line. A landing that would need new behaviour is a question, never a numbered line.

**Record in `## Observable`** in the task, one row per item.

## Sweep

The fixed list of what nobody writes down: validation, failure modes, idempotency and retry, authorization, concurrency and ordering, data lifecycle, external-dependency failure, state transitions, observability.

Walk all nine, every time. Write where each landed: a criterion already written, something the code already handles, `n/a` with the reason, or `Unresolved`. Concurrency and observability hide better than the other seven.

A landing must observe **that** dimension. Reaching for a number already used on another line is the tell it is uncovered. The `n/a` escape stops the list from manufacturing requirements.

**Record in `## Swept`** in the task, one line each.

## Refuse rather than guess

Five things must be true of every criterion:

- Someone could **observe** the outcome
- It carries a **concrete value** — never "gracefully", "properly" or "fast"
- **One run settles it** — a single execution satisfies or fails it
- When it claims something will **not** happen, you can name what prevents it
- The **boundary** is stated

**One run settles it.** Percentiles, averages, uptime and error rates are service targets, not criteria. Split the line.

**A guarantee needs a mechanism.** Nothing prevents a duplicate by default. Point at the code or the `Decided` row, or it is a hope.

Missing one is normal. **Ask** — not note it and move on. A gray area is a decision that is genuinely the user's, has more than one defensible answer, and is not settled by the code.

Questions follow turn-cost rules: concrete options never open prompts; lead with recommendation; assume first when safe; at most two independent questions per turn; the boundary is fixed — asking clarifies how, never whether to add capability.

**Facts you look up; decisions you ask.** What survives is what only Product or a tech lead can settle, and that goes to `Unresolved`.

## Output

Produce the artifact; do not narrate the phase. Read `references/document-format.md` when writing `.tasks/<name>.md`. Present the cut, then the tasks, then the open questions with blocking ones first. Lead with the verdict. State decisions definitively.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Split it into smaller tasks" | Default to one. Split only for order constraints, external answers, or another team. |
| "This criterion sounds fine" | If it lacks a concrete value, it is too vague. Push until it has one. |
| "Just note the question and move on" | A note without a default is an open loop. State the default and invite correction. |
| "The source has too many requirements to walk all nine dimensions" | Walking all nine is the mechanism. Skipping one is how concurrency or observability ships unhandled. |

## Red Flags

- Slices cut by layer instead of by observable outcome
- Criteria that use words like "gracefully", "properly", or "fast" without a number
- A sweep dimension that lands on a criterion from a different dimension
- More than two questions in a single turn
- A task with no `Unresolved` section and no `None`
- Criteria that could only be proven by running the full suite

## Verification

After producing the task artifact:

- [ ] Every criterion is an observable outcome with a concrete value
- [ ] One run settles each criterion
- [ ] Observable has a landing per surface item
- [ ] Swept has all nine landings
- [ ] Unresolved is a table (or `None` with one row)
- [ ] Decided carries only hard-to-reverse choices with literal shapes
- [ ] The task names which skill builds it (verified-implementation)

## See Also

- `idea-discovery` — produces the design document this skill turns into tasks
- `verified-implementation` — builds from the task artifact this skill produces
- `spec-driven` — full pipeline from specify through execute
- `incremental-implementation` — delivers changes in thin verifiable slices
