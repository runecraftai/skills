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

- **Specify and Execute are always required on the pipeline path** — you always need to know WHAT and DO it; **Cut only** is the single exception, because a source that is already decided carries its own WHAT
- **Design is skipped** when the change is straightforward (no architectural decisions, no new patterns)
- **Tasks is skipped** when there are ≤3 obvious steps (they become implicit in Execute)
- **Cut only is a complete run** — a decided source, with nobody asking for a `.specs/` pipeline, stops at `.tasks/<name>.md`. It is the Tasks phase without the phases around it, not a lesser one: it skips nothing about the cut, the grounding, the surfaces or the sweep.
- **Discuss is triggered within Specify** when the agent detects ambiguous gray areas that need user input, or when the feature has any implicit-requirement dimension present (persistence/state, external calls, auth, payments, concurrency, state transitions)
- **Interactive UAT is triggered within Execute** only for user-facing features with complex behavior

**Safety valve:** Even when Tasks is skipped, Execute starts by listing atomic steps inline. If that listing reveals >5 steps or complex dependencies, STOP and create a formal `tasks.md` — the Tasks phase was wrongly skipped.

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

**Decompose before specifying when a single requirement bundles several independently testable capabilities:** they name distinct capabilities with their own consumers or data, their acceptance criteria cluster into groups that could ship and be verified separately, and one could be cut or replaced without rewriting the others' requirements.

**Propose a capability map before writing any spec.** Small and reviewable — a module table plus a build order, not a project plan — and gated like every phase: the human reviews module boundaries, dependency direction and build order before any module spec is written. Then recurse per module in dependency order, one spec per module scoped to that module's objective.

Module-id, dependency-direction and boundary rules, and the map template, have one owner: [specify.md](references/specify.md) § Capability Mapping.

### Plan and Task List Files

**Plan document:** save the implementation plan to `tasks/plan.md` — always markdown, because design decisions, risks and open questions don't map cleanly onto individual tracker issues. **Task list:** record each task in the task list target — default a checklist-style `tasks/todo.md`, or one tracker item per task when the project's agent rules or the user designate an issue tracker (note it in `tasks/plan.md`).

**Never overwrite an incomplete plan.** Before writing either file, check whether it exists and still contains unchecked tasks: same work being replanned → update in place; different work → **stop and ask**, and never delete, rename or bulk-close another plan's open items on your own. Conventions, the external-tracker mapping and the conflict handling have one owner: [implement.md](references/implement.md) § Plan and Task List Files.

### Resume work:

Read `.specs/STATE.md` — Handoff section for in-flight state, Decisions section to re-confirm active constraints — then propose the next step.

## Tasks — the cut

Cut the source. Ground it in the code. Write the task.

The Tasks phase for work someone already decided: a design doc, PRD, RFC, thread or one-line ticket. Reach for it when the user says "write the task" or "cut this into work", or when work is decided but nobody has broken it into verifiable slices. It turns that decision into work a builder can pick up without guessing, and stops at the first thing nobody decided by walking two fixed lists instead of inventing a feature.

```
CUT ──────────→ GROUND ──────────→ WRITE
(slices, then   (the repository     (one task,
 how many        it lands in)        unless a seam
tasks)                               is forced)
```

**A slice is one observable outcome, never a layer.** Default to one task for the whole source; split only when a piece cannot land before another without breaking production, waits on an answer only someone else can give, or belongs to another team. A slice that spans schema, API and UI is one task when one run can settle it; four tasks on the same file are four tasks when each proves something the others cannot.

**The mechanics have one owner: [cut.md](references/cut.md).** Read it before cutting — it carries the cut, the grounding questions, the five surface kinds and the decisions each carries, the nine-dimension sweep, the refuse-rather-than-guess checks and the write step.

**The artifact has one owner: [document-format.md](references/document-format.md).** Read it when writing `.tasks/<name>.md` — it owns the document's sections and the canonical nine-dimension rubric. Present the cut, then the tasks, then the open questions with blocking ones first; lead with the verdict.

Cut-only produces `.tasks/<name>.md` and stops after the task. In-pipeline (Large/Complex) the same cut lands in `.specs/features/[feature]/tasks.md` per [tasks.md](references/tasks.md), which adds the Test Coverage Matrix, the Parallelism Assessment and the Gate Check Commands.

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

**Verifier (always-on, never prompted):** After the final task is committed, the orchestrator dispatches a fresh Verifier sub-agent automatically — regardless of phase count. Validation never requires a user prompt; it is the closing step of Execute. **Author ≠ verifier**: the Verifier re-derives coverage independently using evidence-or-zero and does not inherit the author's mental model. It runs the spec-anchored outcome check and the discrimination sensor, writes `.specs/features/[feature]/validation.md`, distills each grounded failure into a project lesson ([lessons.md](references/lessons.md)), and returns a compact verdict with ranked gaps; the fix→re-verify loop is bounded to 3 iterations before escalating. Process and report format: [sub-agents.md](references/sub-agents.md).

**Standalone fallback:** Without sub-agents, run [validate.md](references/validate.md) as an independent fresh-eyes pass after the final commit. Worker payload, compact summary format, failure handling, context sizing and Verifier report format: [sub-agents.md](references/sub-agents.md).

## Commands

**Feature-level (auto-sized):**
| Trigger Pattern | Reference |
|----------------|-----------|
| Specify feature, define requirements | [specify.md](references/specify.md) |
| Discuss feature, capture context, how should this work | [discuss.md](references/discuss.md) |
| Design feature, architecture | [design.md](references/design.md) |
| Break into tasks, create tasks | [tasks.md](references/tasks.md) |
| Task-document format, the canonical rubric | [document-format.md](references/document-format.md) |
| Cut decided work into a task, write the task | [cut.md](references/cut.md) |
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

The traps specific to the cut — splitting into smaller tasks, settling for a vague criterion, noting a question instead of asking it, skipping a dimension — live with the cut itself: [cut.md](references/cut.md#common-rationalizations).

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
- A cut that skipped its own traps and hand-off checks ([cut.md](references/cut.md#hand-off-checks))
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
- [ ] Checkpoints exist between major phases

On the Cut-only path, the checks that belong to the cut — landings, one-way doors, `Unresolved`, who builds it — are [cut.md](references/cut.md#hand-off-checks) § Hand-off checks.

## See Also

Acceptance criteria are per-task and answer "did we build the right thing?". They sit on top of the project-wide Definition of Done — the standing bar every task clears before it counts as done (`../../references/definition-of-done.md`).

- **`git-commit-learning`** — for writing AI-learnable commit messages during Execute.
- **`idea-discovery`** — produces the design document the Tasks phase cuts into work.
- **`verified-implementation`** — builds from the task artifact this skill produces when no `.specs/` pipeline is wanted.
- **`incremental-implementation`** — delivers changes in thin verifiable slices.
- **`spec-driven-development`** — absorbed into this skill. Its gated workflow, capability mapping, and detailed spec structure are now part of the Specify phase.
- **`planning-and-task-breakdown`** — absorbed into this skill. Its dependency-graph mapping, vertical slicing, output file conventions, and checkpoint strategy are now part of the Tasks phase.
- **`task-cutting`** — absorbed into this skill. Its surface walk, nine-dimension sweep, one-way-door table, task-document format and Cut-only path are now the Tasks phase; [document-format.md](references/document-format.md) owns the task document and the nine-dimension rubric. Upstream: `tech-leads-club/agent-skills` `tlc-plan` @ v0.2.0 (CC-BY-4.0, Copyright Tech Leads Club).
