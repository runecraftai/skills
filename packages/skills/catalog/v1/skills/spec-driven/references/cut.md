# The cut: Cut → Ground → Walk the surfaces → Sweep the nine → Write

Load this before cutting a decided source — a design doc, PRD, RFC, thread or one-line ticket — into tasks. It owns the mechanism. [document-format.md](document-format.md) owns the artifact you write at the end and the canonical nine-dimension rubric; the in-pipeline Tasks phase ([tasks.md](tasks.md)) reuses this same cut and adds the Test Coverage Matrix, the Parallelism Assessment and the Gate Check Commands.

A one-line ticket counts; a blank "we should do something about billing" does not. This turns a decision into work a builder can pick up without guessing, and stops at the first thing nobody decided. It finds the operational hole the source left implicit by walking two fixed lists, not by inventing a feature.

Reach for it when a design doc, PRD, RFC or thread describes what to build and you need tasks; when the user says "write the task" or "cut this into work"; when work is decided but nobody has broken it into verifiable slices; or when you need to ground a plan in the actual codebase before handing it off.

```
CUT ──────────→ GROUND ──────────→ WRITE
(slices, then   (the repository     (one task,
 how many        it lands in)        unless a seam
tasks)                               is forced)
```

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

A surface is anything outside the system that meets it. Five kinds exist, and each carries the same decisions every time — this table is their single owner:

| Surface | The decisions it always has |
| --- | --- |
| screen or view | empty, loading, error, unauthorised states; layout and density; ordering; interactions and visual hierarchy; destructive action confirmation |
| API or webhook | response shape, error shape with codes, who may call it, versioning, rate limit behaviour |
| command or scheduled task | output format, every flag and default, modes and verbosity, exit codes, failure output |
| document or copy | structure, tone, depth, flow and navigation, what the reader does next |
| collection being organised | grouping criterion, naming, ordering, duplicates, the exception |

**Backend, state and contract is a sixth lane with no surface of its own** — it is the nine-dimension rubric below. When the work exposes it, the sweep is the walk.

**The walk finds gaps. It does not write criteria.** Each item resolves to a criterion **already in the source or already written from it**, to something the code already does (`existing - <what>`), to `n/a - <reason>`, or to `Unresolved <n>`. The `n/a` escape is mandatory and it is what stops the list from inventing scope: a webhook has no empty state, and saying so costs a line. A landing that would need new behaviour is a question, never a numbered line.

**Record in `## Observable`** in the task, one row per item.

## Sweep the nine

The fixed list of what nobody writes down has one owner: [document-format.md](document-format.md) § Canonical rubric. Load it, walk all nine dimensions, and land each one — a criterion already written, something the code already does, `n/a` with the reason, or `Unresolved`. Concurrency and observability hide better than the other seven.

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

## Write

Produce the artifact; do not narrate the phase. Read [document-format.md](document-format.md) when writing `.tasks/<name>.md`: intent, numbered criteria, the surface and sweep landings, impact, `Decided` as one-way doors, sources, and `Unresolved` as a table. Present the cut, then the tasks, then the open questions with blocking ones first. Lead with the verdict. State decisions definitively.

In-pipeline (Large/Complex) the same cut lands in `.specs/features/[feature]/tasks.md` per [tasks.md](tasks.md), which adds the Test Coverage Matrix, the Parallelism Assessment and the Gate Check Commands. Cut-only produces `.tasks/<name>.md` and stops.

## Hand-off checks

Confirm every one before the task leaves your hands:

- [ ] Every criterion is an observable outcome with a concrete value, and one run settles each one
- [ ] `Observable` has a landing per surface item, and `Swept` has all nine
- [ ] `Decided` carries only hard-to-reverse choices with literal shapes
- [ ] `Unresolved` is a table (or `None` with one row), and no criterion carries two triggers or two independently failable outcomes
- [ ] The task names which skill builds it (`verified-implementation`)

## Red flags

- Slices cut by layer instead of by observable outcome
- Criteria that use words like "gracefully", "properly", or "fast" without a number
- A sweep dimension that lands on a criterion from a different dimension
- More than two questions in a single turn
- A task with no `Unresolved` section and no `None`
- Criteria that could only be proven by running the full suite

## Common rationalizations

| Rationalization | Reality |
|---|---|
| "Split it into smaller tasks" | Default to one. Split only for order constraints, external answers, or another team. |
| "This criterion sounds fine" | If it lacks a concrete value, it is too vague. Push until it has one. |
| "Just note the question and move on" | A note without a default is an open loop. State the default and invite correction. |
| "The source has too many requirements to walk all nine dimensions" | Walking all nine is the mechanism. Skipping one is how concurrency or observability ships unhandled. |
