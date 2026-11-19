# The cut: Cut → Ground → Walk the surfaces → Sweep the nine → Write

This is the procedure for turning a decided source into tasks. Read it to the end before you start cutting. A source qualifies when it already holds a decision: a design doc, a PRD, an RFC, a thread, or a ticket — a single line is enough. A wish with no decision in it ("something should be done about billing") does not qualify. The procedure lives here. The artifact you produce at the end, and the canonical nine-dimension rubric, live in [document-format.md](document-format.md). Inside the pipeline, [tasks.md](tasks.md) runs this same cut and adds the Test Coverage Matrix, the Parallelism Assessment and the Gate Check Commands.

The goal is work a builder can start without filling anything in themselves, with a hard stop at the first point the source never decided. Gaps the source leaves unsaid are found by holding it up against two fixed lists — the surface table and the nine dimensions — never by inventing features it did not ask for.

Use it when:

- a design doc, PRD, RFC or thread settles what gets built and the work still has to become tasks
- the user asks you to "write the task" or "cut this into work"
- the work is decided but has not been split into slices that can each be verified
- a plan has to be checked against the actual codebase before it is handed on

```
CUT ───────────→ GROUND ──────────→ WRITE
list the slices,  check them against  one task, unless a
then count the    the repository      forced seam splits it
tasks
```

## Cut

Read all of every source before anything else. List the slices first; how many tasks they become is a separate decision you make afterwards.

**Slice by observable outcome, never by layer.** Each slice is one thing someone can watch happen. Layered pieces — the schema now, the endpoints later — cannot be verified on their own, so they are not slices.

**Start from one task that covers the whole source.** Exactly three reasons justify splitting a piece off:

1. it cannot land ahead of another piece without breaking production;
2. it is waiting on an answer that only someone else can give;
3. another team owns it.

The number of slices says nothing about whether the whole is safe: six slices with no one-way doors are fine as one task, while three slices carrying four doors and a migration are not.

When the source is large, lay the seams out — ordering constraints first, then thematic groupings, each with its reason — and let the user choose where to cut.

## Ground

Only now open the repository. Three questions have no answer outside the code:

- **What does the change disturb?** Find any existing term whose meaning shifts, and every caller that relies on it.
- **Which decisions are truly one-way?** Telling a new pattern from an everyday one takes reading the conventions.
- **Where is the source just wrong?** Terms the system does not have, APIs that are not there.

Placement is not one of them. Do not settle it here: the repository's conventions decide most of it, and whatever they leave open can still be changed later.

## Walk the surfaces

A surface is any point where something outside the system meets it. There are five kinds, and each one brings the same decisions every time. This table is the only place those decisions are listed:

| Surface | The decisions it always has |
| --- | --- |
| screen or view | empty, loading, error, unauthorised states; layout and density; ordering; interactions and visual hierarchy; destructive action confirmation |
| API or webhook | response shape, error shape with codes, who may call it, versioning, rate limit behaviour |
| command or scheduled task | output format, every flag and default, modes and verbosity, exit codes, failure output |
| document or copy | structure, tone, depth, flow and navigation, what the reader does next |
| collection being organised | grouping criterion, naming, ordering, duplicates, the exception |

**Backend, state and contract form a sixth lane with no surface of its own.** Walking that lane is the nine-dimension sweep below, whose list [document-format.md](document-format.md) owns. When the work touches it, the sweep is how you walk it.

**Walking finds gaps; it never authors criteria.** Every item lands in one of four places:

- a criterion the source **already contains, or one already derived from it**
- `existing - <what>` — the code already does it
- `n/a - <reason>`
- `Unresolved <n>`

`n/a` is required, and it is what keeps the walk from inventing scope: a webhook cannot have an empty state, and one line records that. If landing an item would take behaviour nobody specified, the item becomes a question — never a numbered criterion.

**Write the result into the task's `## Observable`**, one row per item.

## Sweep the nine

The list of things a source leaves unsaid is owned by [document-format.md](document-format.md) § Canonical rubric. Load it, take all nine dimensions, and give each the same kind of landing: a written criterion, behaviour the code already has, `n/a` plus its reason, or `Unresolved`. Watch concurrency and observability hardest; they are the two most easily missed.

Each landing has to observe the dimension it is filed under. Pointing at a criterion number that already serves another line means this dimension is not covered. `n/a` is what keeps the sweep from manufacturing requirements.

**Write the result into the task's `## Swept`**, one line per dimension.

## Refuse rather than guess

A criterion is not ready until all five hold:

- a person could **observe** the outcome
- it names a **concrete value** — "gracefully", "properly" and "fast" are not values
- **one run settles it**: executing once is enough to pass or fail it
- if it promises that something will **not** happen, the thing preventing it can be named
- its **boundary** is stated

**One run, one verdict.** Percentiles, averages, uptime, error rates: these are service targets rather than criteria. Break such a line apart.

**A guarantee needs something that enforces it.** Left alone, nothing stops a duplicate. Cite the code or the `Decided` row that does, or the guarantee is only a hope.

A criterion that fails one of these is ordinary. The answer is to **ask** — not to leave a note and carry on. Ask about gray areas: decisions that genuinely belong to the user, have more than one defensible answer, and are not already settled by the code.

Keep every question cheap for the person answering:

- when the options are concrete, offer them — never an open prompt
- put your recommendation first
- when it is safe to, assume first
- no more than two independent questions in one turn
- the boundary does not move: a question may clarify how, never whether to add a capability

**Look facts up; ask about decisions.** Whatever remains — the calls reserved for Product or a tech lead — goes into `Unresolved`.

## Write

Deliver the artifact, not an account of how you reached it. When writing `.tasks/<name>.md`, read [document-format.md](document-format.md): intent, numbered criteria, the surface and sweep landings, impact, `Decided` as the one-way doors, sources, and `Unresolved` as a table. Report in this order: the cut first, the tasks next, and the open questions last, blocking ones on top. Open with the verdict, and state decisions as decisions.

Inside the pipeline (Large/Complex), the same cut goes to `.specs/features/[feature]/tasks.md` following [tasks.md](tasks.md), which adds the Test Coverage Matrix, the Parallelism Assessment and the Gate Check Commands. Cut-only writes `.tasks/<name>.md` and ends there.

## Hand-off checks

The task does not leave your hands until every box is ticked:

- [ ] Each criterion states an observable outcome and its concrete value, and a single run settles it
- [ ] `Observable` has a landing for every surface item, and `Swept` has all nine
- [ ] `Decided` holds only hard-to-reverse choices, each in its literal shape
- [ ] `Unresolved` is a table (or `None` in a single row), and no criterion mixes two triggers, or two outcomes able to fail independently
- [ ] The task names the skill that builds it (`verified-implementation`)

## Red flags

- Slices that follow layers instead of observable outcomes
- A criterion saying "gracefully", "properly", "fast" or the like, with no number attached
- A sweep dimension landed on a criterion that belongs to another dimension
- A turn that asks more than two questions
- A task that has neither an `Unresolved` section nor `None`
- A criterion only the full test suite could prove

## Common rationalizations

| Rationalization | Reality |
|---|---|
| "Smaller tasks are safer" | One task is the default. Split only for an ordering constraint, an answer from outside, or another team. |
| "The criterion reads fine" | Without a concrete value it is still vague. Keep pushing until it has one. |
| "I'll jot the question down and keep going" | A note with no default leaves the loop open. Say what you will assume and invite correction. |
| "There are too many requirements to sweep all nine" | Sweeping all nine is the method. Dropping one is exactly how concurrency or observability reach production unhandled. |
