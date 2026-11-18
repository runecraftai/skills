---
name: spec-driven
description: >
  Planning and implementation across four adaptive phases — Specify, Design, Tasks, Execute — with
  observable task criteria, atomic commits, an independent Verifier (author != verifier) and a
  lessons layer. Also cuts decided work (a PRD, design doc, RFC, or thread) into tasks a builder
  can act on: slices grounded in the code, every surface walked, nine unwritten-requirement
  dimensions swept. Stack-agnostic. Use when planning features or cutting decided work into tasks.
  Triggers (PT/EN): "specify feature", "vamos especificar", "discutir feature", "design", "design
  da feature", "tarefas", "quebrar em tarefas", "implementar", "build", "validar", "verify
  work", "UAT", "validar implementação", "/spec", "/planning", "planning and task breakdown",
  "break into tasks", "write the task", "cut this PRD into tasks", "turn this design doc into
  work". Do NOT use for discovery (idea-discovery), intent extraction (interview-me), a decided
  ticket with no plan (verified-implementation), or architecture decomposition.
license: CC-BY-4.0
metadata:
  version: 6.0.0
---

# spec-driven

Plan and implement features with precision. Verifiable slices. Clear dependencies. Right tools. Zero ceremony.

```
┌──────────┐   ┌──────────┐   ┌─────────┐   ┌─────────┐
│ SPECIFY  │ → │  DESIGN  │ → │  TASKS  │ → │ EXECUTE │
└──────────┘   └──────────┘   └─────────┘   └─────────┘
   required      optional*      optional*     required

* Agent auto-skips when scope doesn't need it
```

## Critical Rules (read before acting)

**Loading this skill's files.** Reference files live under `references/` in this skill's own directory (where this `SKILL.md` resides). Resolve them relative to the skill directory — never the workspace root — and load them through the active skill by name; never assume a fixed install path. When a step tells you to read a reference, **read it completely (to EOF)** before acting — never act on a partial/truncated read.

**Execution contract — every task, non-negotiable (holds even if you do not open the reference files):**

1. Tests derive from the spec's acceptance criteria and assert spec-defined outcomes — they never mirror the implementation.
2. The gate must pass (tests pass) before a task is done — the test runner decides, not self-assessment.
3. One atomic commit per task. Never batch tasks; never weaken, skip, or delete tests to make them pass.
4. After the LAST task, a fresh **Verifier always runs automatically** (author ≠ verifier) — spec-anchored outcome check + discrimination sensor. It is never optional and never prompted. See Sub-Agent Delegation.
5. Every criterion is an **observable outcome with a concrete value**. "The columns exist" is not a criterion.
6. **Refuse rather than guess.** A gap in the source comes back as a question.
7. `Decided` carries only what is **hard to reverse**. Everything reversible is decided while building.
8. **Raising a concern is free; growing scope is the user's call.**
9. When the source contradicts the code, **amend the source**. The task is the record of decision; linked documents keep the reasoning.

**Before Execute:** read [implement.md](references/implement.md) completely; if a formal `tasks.md` has more than 3 phases, present the sub-agent offer first (see Sub-Agent Delegation).

## Auto-Sizing: The Core Principle

**The complexity determines the depth, not a fixed pipeline.** Before starting any feature, assess its scope and apply only what's needed:

| Scope       | What                     | Specify                                                 | Design                                          | Tasks                         | Execute                                               |
| ----------- | ------------------------ | ------------------------------------------------------- | ----------------------------------------------- | ----------------------------- | ----------------------------------------------------- |
| **Small**   | ≤3 files, one sentence   | One-liner spec (inline)                                 | Skip                                            | Skip                          | Implement + verify inline                             |
| **Medium**  | Clear feature, <10 tasks | Spec (brief)                                            | Skip — design inline                            | Skip — tasks implicit         | Implement + verify                                    |
| **Large**   | Multi-component feature  | Full spec + requirement IDs                             | Architecture + components                       | Full breakdown + dependencies | Implement + verify per task                           |
| **Complex** | Ambiguity, new domain    | Full spec + [discuss gray areas](references/discuss.md) | [Research](references/design.md) + architecture | Breakdown + parallel plan     | Implement + [interactive UAT](references/validate.md) |
| **Cut only** | A decided source, no `.specs/` pipeline | Skip | Skip | Cut → Ground → surfaces → sweep → `.tasks/<name>.md` | **Stop after the task** |

**Rules:**

- **Specify and Execute are always required** — you always need to know WHAT and DO it
- **Design is skipped** when the change is straightforward (no architectural decisions, no new patterns)
- **Tasks is skipped** when there are ≤3 obvious steps (they become implicit in Execute)
- **Cut only is a complete run** — when someone already decided the source and nobody asked for a `.specs/` pipeline, stop at `.tasks/<name>.md`. That path is the Tasks phase without the phases around it, not a lesser one: it skips nothing about the cut, the grounding, the surfaces or the sweep.
- **Discuss is triggered within Specify** when the agent detects ambiguous gray areas that need user input, or when the feature has any implicit-requirement dimension present (persistence/state, external calls, auth, payments, concurrency, state transitions)
- **Interactive UAT is triggered within Execute** only for user-facing features with complex behavior

**Safety valve:** Even when Tasks is skipped, Execute ALWAYS starts by listing atomic steps inline (see [implement.md](references/implement.md)). If that listing reveals >5 steps or complex dependencies, STOP and create a formal `tasks.md` — the Tasks phase was wrongly skipped.

## .specs Structure

```
.specs/
├── STATE.md            # Project memory: Decisions log (AD-NNN) + Handoff snapshot
├── LESSONS.md          # Self-improving lessons playbook (rendered by scripts/lessons.py — do not hand-edit)
├── lessons.json        # Canonical lessons state (machine-owned)
└── features/           # Feature specifications
    └── [feature]/
        ├── spec.md         # Requirements with traceable IDs
        ├── context.md      # User decisions for gray areas (only when discuss is triggered)
        ├── design.md       # Architecture & components (only for Large/Complex)
        ├── tasks.md        # Atomic tasks with verification (only for Large/Complex)
        └── validation.md   # Verifier report: PASS/FAIL, per-AC evidence, sensor result, diff range
```

## .tasks Structure

```
.tasks/
└── <name>.md           # One task document: intent, numbered criteria, surface and sweep landings,
                        # impact, one-way doors, sources, unresolved questions
```

Written on the Cut-only path, and whenever the cut is itself the deliverable. [document-format.md](references/document-format.md) owns its sections — the headings are a schema, and `verified-implementation` copies criteria and landings out of it by name.

## Workflow

**New feature:**

1. Specify → (Design) → (Tasks) → Execute (depth auto-sized)

### Capability Mapping (Pre-Specify)

Most requests describe one capability. If this one does, skip this phase and go straight to Specify — it exists for the exception, not the rule, and puts no hierarchy on single-capability features.

**Decompose before specifying when a single requirement bundles several independently testable capabilities:**
- The requirement names distinct capabilities with their own consumers or data (e.g. identity, billing, notifications, reporting)
- Acceptance criteria cluster into groups that could ship and be verified separately
- One capability could be cut or replaced without rewriting the others' requirements

**Propose a capability map before writing any spec.** Small and reviewable — a module table plus a build order, not a project plan:

```markdown
# Capability Map: [Initiative Name]

| Module id | Responsibility | Depends on |
|---|---|---|
| identity | Accounts, sessions, SSO | — |
| billing | Plans, invoices, payments | identity |
| notifications | Email and webhook fan-out | identity |
| reporting | Usage dashboards | billing, notifications |

Build order: identity → billing, notifications → reporting
```

- **Stable module ids.** Kebab-case, chosen once, never renamed mid-initiative. Specs, plans, and downstream commands select work by these ids instead of guessing which spec is active.
- **Dependency direction, no cycles.** Arrows point one way. If two modules each need the other, they are one module.
- **Interfaces live at the boundary.** The map records that `billing` depends on `identity`; the contract between them belongs in the provider module's spec.

**The map is gated like every phase.** The human reviews module boundaries, dependency direction, and build order before any module spec is written.

**Then recurse per module.** Run Specify → Plan → Tasks → Implement for each module in dependency order. Each module gets its own spec, scoped to that module's objective, boundaries, and success criteria. Save the approved map at the project root and each module's spec alongside it, named by module id (`SPEC-identity.md`, `SPEC-billing.md`) — the map, not filename guessing, is the index of what exists.

### Plan Document and Output Files

**Plan document:** Save the implementation plan to `tasks/plan.md`. This is always a markdown file — design decisions, risks, and open questions don't map cleanly onto individual tracker issues.

**Task list:** Record each task in the **task list target** (defined below). Create the `tasks/` directory if it does not exist.

**Never overwrite an incomplete plan.** Before writing `tasks/plan.md` or `tasks/todo.md`, check whether they already exist and still contain unchecked tasks:

- Same work being replanned (the user asked to revise or extend this plan) → update the existing files in place.
- Different work → **stop and ask.** The unchecked tasks may be mid-build in another session. Do not delete, overwrite, or rename the existing files on your own; present the conflict and let the user decide.

The same rule applies to an external task list target: never bulk-close or delete another plan's open tracker items to make room for new ones.

**Task list target:** Where tasks and checkpoints are recorded.

- **Default: a checklist-style markdown file at `tasks/todo.md`.** This is the convention downstream tooling expects. Use it unless the project says otherwise.
- **External tracker:** if the project's agent rules (`CLAUDE.md`, `AGENTS.md`, etc.) or the user designate an issue tracker (e.g. GitHub Issues, Jira, Linear), create one tracker item per task instead of writing `tasks/todo.md`. Map the task structure onto the tracker's fields. Record Step 5 checkpoints as tracker items too.

When using an external tracker, note it in `tasks/plan.md` so downstream steps know where to look.

### Resume work:

Read `.specs/STATE.md` — Handoff section for in-flight state, Decisions section to re-confirm active constraints — then propose the next step.

## Tasks — the cut

Cut the source. Ground it in the code. Write the task.

The Tasks phase for work someone already decided. A one-line ticket counts; a blank "we should do something about billing" does not. This turns that decision into work a builder can pick up without guessing, and stops at the first thing nobody decided. It finds the operational hole the source left implicit by walking two fixed lists, not by inventing a feature.

Reach for it when a design doc, PRD, RFC or thread describes what to build and you need tasks; when the user says "write the task" or "cut this into work"; when work is decided but nobody has broken it into verifiable slices; or when you need to ground a plan in the actual codebase before handing it off.

```
CUT ──────────→ GROUND ──────────→ WRITE
(slices, then   (the repository     (one task,
 how many        it lands in)        unless a seam
tasks)                               is forced)
```

### Cut

Read every source completely first. Then enumerate the slices and only after that decide how many tasks they become.

**A slice is one observable outcome, never a layer.** "Schema first, then endpoints" produces pieces nobody can verify alone.

**Default to one task for the whole source.** Split only when: a piece cannot land before another without breaking production, a piece waits on an answer only someone else can give, or a piece belongs to another team. Six slices with no doors is safe whole; three slices with four doors and a migration is not.

When big, show the seams — order constraints first, then thematic groupings with reasons. Let the user pick where to cut.

### Ground

Now open the repository. Three things only the code answers:

- **What the change disturbs.** Which existing term changes meaning, and who depends on it today.
- **Which decisions are actually one-way.** You cannot tell a new pattern from an ordinary one without reading conventions.
- **Where the source is simply wrong.** Names the system does not use, APIs that do not exist.

What you do **not** settle here is placement — the repository's conventions answer most of it and the rest is reversible.

### Walk the surfaces

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

### Sweep the nine

The fixed list of what nobody writes down has one owner: [document-format.md](references/document-format.md) § Canonical rubric. Load it, walk all nine dimensions, and land each one — a criterion already written, something the code already does, `n/a` with the reason, or `Unresolved`. Concurrency and observability hide better than the other seven.

A landing must observe **that** dimension. Reaching for a number already used on another line is the tell it is uncovered. The `n/a` escape stops the list from manufacturing requirements.

**Record in `## Swept`** in the task, one line each.

### Refuse rather than guess

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

### Write

Produce the artifact; do not narrate the phase. Read [document-format.md](references/document-format.md) when writing `.tasks/<name>.md`: intent, numbered criteria, the surface and sweep landings, impact, `Decided` as one-way doors, sources, and `Unresolved` as a table. Present the cut, then the tasks, then the open questions with blocking ones first. Lead with the verdict. State decisions definitively.

In-pipeline (Large/Complex) the same cut lands in `.specs/features/[feature]/tasks.md` per [tasks.md](references/tasks.md), which adds the Test Coverage Matrix, the Parallelism Assessment and the Gate Check Commands. Cut-only produces `.tasks/<name>.md` and stops.

## Context Loading Strategy

**On-demand load (only what the current task needs):**

- `.specs/STATE.md` — Decisions section (read at Design, re-read on resume); Handoff section (read on resume only)
- confirmed lessons — load at Specify and Design via `python3 scripts/lessons.py list --status confirmed` ([lessons.md](references/lessons.md)); confirmed only, never candidates
- spec.md (when working on a specific feature)
- context.md (when designing or implementing from user decisions)
- design.md (when implementing from design)
- tasks.md (when executing tasks)

**Never load simultaneously:**

- Multiple feature specs
- Multiple architecture docs

**Target:** <40k tokens total context
**Reserve:** 160k+ tokens for work, reasoning, outputs
**Monitoring:** Display status when >40k (see [context-limits.md](references/context-limits.md))

## Sub-Agent Delegation

**Trigger:** >3 phases → offer one worker per phase (sequential); ≤3 phases → execute inline.

**Offer-then-confirm** — never auto-spawn. The user must accept before any sub-agent is dispatched.

**One worker per phase:** Each phase worker executes all its tasks in order (implement → gate → atomic commit), then reports a compact summary (tasks done, commit hashes, test counts, deviations). Workers never spawn further sub-agents.

**Verifier (always-on, never prompted):** After the final task is committed, the orchestrator dispatches a fresh Verifier sub-agent automatically — regardless of phase count. Validation never requires a user prompt; it is the closing step of Execute. **Author ≠ verifier**: the Verifier re-derives coverage independently using evidence-or-zero; it does not inherit the author's mental model. The Verifier: (1) performs a **spec-anchored outcome check** — confirms each test's asserted value matches the spec-defined expected outcome, flags spec-precision gaps; (2) runs a **discrimination sensor** — injects behavior-level faults in scratch state, confirms tests kill them, discards mutations, surviving mutants become fix tasks; (3) writes `.specs/features/[feature]/validation.md` (PASS/FAIL, per-AC evidence, sensor result, diff range); (4) returns a compact verdict + ranked gap list to the orchestrator in chat. Gaps become fix tasks; the fix→re-verify loop is bounded to 3 iterations before escalating. (5) **distills lessons** — turns each grounded failure (surviving mutant, spec-precision gap, failed AC, SPEC_DEVIATION) into a reusable project-local lesson via `scripts/lessons.py`; a clean PASS records nothing (see [lessons.md](references/lessons.md)).

**Standalone fallback:** Without sub-agents, run `validate.md` as an independent fresh-eyes pass after the final commit — including the spec-anchored check and discrimination sensor.

Full mechanics (worker payload, compact summary format, failure handling, context sizing, Verifier report format): [sub-agents.md](references/sub-agents.md).

## Commands

**Feature-level (auto-sized):**
| Trigger Pattern | Reference |
|----------------|-----------|
| Specify feature, define requirements | [specify.md](references/specify.md) |
| Discuss feature, capture context, how should this work | [discuss.md](references/discuss.md) |
| Design feature, architecture | [design.md](references/design.md) |
| Break into tasks, create tasks | [tasks.md](references/tasks.md) |
| Cut decided work into a task, write the task | [document-format.md](references/document-format.md) |
| Implement task, build, execute | [implement.md](references/implement.md) |
| Validate, verify, test, UAT, walk me through it | [validate.md](references/validate.md) |

**Memory:**
| Trigger Pattern | Reference |
|----------------|-----------|
| Record decision, this is a project-level decision | [memory.md](references/memory.md) |
| Pause work, end session, I need to stop | [memory.md](references/memory.md) |
| Resume work, continue, pick up where we left off | [memory.md](references/memory.md) |
| Load lessons, what have we learned, apply past lessons | [lessons.md](references/lessons.md) |
| Record lesson, distill lessons (auto-runs after validation) | [lessons.md](references/lessons.md) |

## Knowledge Verification Chain

When researching, designing, or making any technical decision, follow this chain in strict order. Never skip steps.

```
Step 1: Codebase → check existing code, conventions, and patterns already in use
Step 2: Project docs → README, docs/, inline comments, `.specs/STATE.md` (Decisions)
Step 3: Context7 MCP → resolve library ID, then query for current API/patterns
Step 4: Web search → official docs, reputable sources, community patterns
Step 5: Flag as uncertain → "I'm not certain about X — here's my reasoning, but verify"
```

**Rules:**

- Never skip to Step 5 if Steps 1-4 are available
- Step 5 is ALWAYS flagged as uncertain — never presented as fact
- **NEVER assume or fabricate.** If you cannot find an answer, say "I don't know" or "I couldn't find documentation for this". Inventing APIs, patterns, or behaviors causes cascading failures across design → tasks → implementation. Uncertainty is always preferable to fabrication.

## Output Behavior

**Model guidance:** After completing lightweight tasks (validation, feature-level checks), naturally mention once per session that such tasks work well with faster/cheaper models. For heavy tasks (complex design, large features), briefly note the reasoning requirements before starting.

Be conversational, not robotic. Don't interrupt workflow—add as a natural closing note. Skip if user seems experienced or has already acknowledged the tip.

## Code Analysis

Use available tools with graceful degradation. See [code-analysis.md](references/code-analysis.md).

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This is simple, I don't need a spec" | Simple tasks don't need *long* specs, but they still need acceptance criteria. A two-line spec is fine. |
| "I'll write the spec after I code it" | That's documentation, not specification. The spec's value is in forcing clarity *before* code. |
| "The spec will slow us down" | A 15-minute spec prevents hours of rework. Waterfall in 15 minutes beats debugging in 15 hours. |
| "Requirements will change anyway" | That's why the spec is a living document. An outdated spec is still better than no spec. |
| "I'll figure it out as I go" | That's how you end up with a tangled mess and rework. 10 minutes of planning saves hours. |
| "The tasks are obvious" | Write them down anyway. Explicit tasks surface hidden dependencies and forgotten edge cases. |
| "Planning is overhead" | Planning is the task. Implementation without a plan is just typing. |
| "I can hold it all in my head" | Context windows are finite. Written plans survive session boundaries and compaction. |
| "It's one big feature; splitting it is overhead" | If acceptance criteria cluster into independently testable groups, a ten-line capability map is the cheap alternative. |
| "Split it into smaller tasks" | Default to one. Split only for order constraints, external answers, or another team. |
| "This criterion sounds fine" | If it lacks a concrete value, it is too vague. Push until it has one. |
| "Just note the question and move on" | A note without a default is an open loop. State the default and invite correction. |
| "The source has too many requirements to walk all nine dimensions" | Walking all nine is the mechanism. Skipping one is how concurrency or observability ships unhandled. |

## Red Flags

- Starting to write code without any written requirements
- Asking "should I just start building?" before clarifying what "done" means
- Implementing features not mentioned in any spec or task list
- Making architectural decisions without documenting them
- Skipping the spec because "it's obvious what to build"
- One spec whose requirements span several independently testable capabilities
- Module boundaries or build order decided implicitly during implementation
- Starting implementation without a written task list
- Overwriting a `tasks/plan.md` or `tasks/todo.md` that still has unchecked tasks for different work, without asking
- Tasks that say "implement the feature" without acceptance criteria
- No verification steps in the plan
- Slices cut by layer instead of by observable outcome
- Criteria that use words like "gracefully", "properly", or "fast" without a number
- A sweep dimension that lands on a criterion from a different dimension
- More than two questions in a single turn
- A task with no `Unresolved` section and no `None`
- Criteria that could only be proven by running the full suite
- No checkpoints between tasks
- Dependency order isn't considered

## Verification

Before proceeding to implementation, confirm:

- [ ] The spec covers all core areas (objective, tech stack, commands, project structure, code style, testing strategy, boundaries, success criteria)
- [ ] The human has reviewed and approved the spec
- [ ] Success criteria are specific and testable
- [ ] Boundaries (Always/Ask First/Never) are defined
- [ ] The spec is saved to a file in the repository
- [ ] If the request bundles several independently testable capabilities, a capability map (module ids, dependency direction, build order) was approved before any module spec was written
- [ ] Every task has acceptance criteria and a verification step
- [ ] Task dependencies are identified and ordered correctly
- [ ] Tasks are recorded in the task list target (default `tasks/todo.md`)
- [ ] No pre-existing incomplete plan was overwritten without explicit user confirmation
- [ ] Every criterion is an observable outcome with a concrete value, and one run settles each one
- [ ] `Observable` has a landing per surface item, and `Swept` has all nine
- [ ] `Decided` carries only hard-to-reverse choices with literal shapes
- [ ] `Unresolved` is a table (or `None` with one row), and no criterion carries two triggers or two independently failable outcomes
- [ ] The task names which skill builds it (`verified-implementation`)
- [ ] Checkpoints exist between major phases

## See Also

Acceptance criteria are per-task and answer "did we build the right thing?". They sit on top of the project-wide Definition of Done, the standing bar every task clears before it counts as done. See `../../references/definition-of-done.md`.

- **`git-commit-learning`** — for writing AI-learnable commit messages during Execute.
- **`idea-discovery`** — produces the design document the Tasks phase cuts into work.
- **`verified-implementation`** — builds from the task artifact this skill produces when no `.specs/` pipeline is wanted.
- **`incremental-implementation`** — delivers changes in thin verifiable slices.
- **`spec-driven-development`** — absorbed into this skill. Its gated workflow, capability mapping, and detailed spec structure are now part of the Specify phase.
- **`planning-and-task-breakdown`** — absorbed into this skill. Its dependency-graph mapping, vertical slicing, output file conventions, and checkpoint strategy are now part of the Tasks phase.
- **`task-cutting`** — absorbed into this skill. Its surface walk, nine-dimension sweep, one-way-door table, task-document format and Cut-only path are now the Tasks phase; [document-format.md](references/document-format.md) owns the task document and the nine-dimension rubric. Upstream: `tech-leads-club/agent-skills` `tlc-plan` @ v0.2.0 (CC-BY-4.0, Copyright Tech Leads Club).
