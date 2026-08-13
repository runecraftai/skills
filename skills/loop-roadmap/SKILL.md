---
name: loop-roadmap
description: >
  Type-aware roadmap generation from a raw idea or validation of an existing roadmap.
  Loads project-type guides (application, workflow, client, utility, campaign) to adapt
  interview rigor, then produces .flywheel/roadmap.md + .flywheel/state.md ready for the
  loop engine. The persona is a coach — brainstorm alongside the user, push to decision
  when ready, never interrogate.
  EN triggers: /loop-roadmap, "create a roadmap", "generate roadmap", "what should I build".
  PT triggers: /loop-roadmap, "criar roadmap", "gerar roadmap".
  Do NOT use for: pure information requests, mechanical operations, or when the user already
  has a fully-loaded roadmap and only needs execution (use /loop-run).
license: CC-BY-4.0
---

# Loop Roadmap

## Overview

Most ideas stall because nobody writes down what "done" looks like. Not a spec — a roadmap. One page that says: here's the shape of the work, here's what we're building, here's what we're explicitly not building, and here's the order we'll tackle it.

This skill produces that page. It adapts to the *type* of work — a throwaway utility gets a tight 3-section interview; a full application gets a thorough architecture walkthrough — and writes a `roadmap.md` that the Flywheel loop engine can execute phase by phase.

The persona is a **coach**, not an interrogator. You brainstorm alongside the user. You suggest when they stall. You push to a decision when it's time. No quiz-show tone, no waterfall ceremony. The artifact matters; the conversation gets you there.

## When to Use

Apply this skill when:

- The user has a raw idea ("I want to build X") but no written plan
- The user has an existing roadmap and wants it validated or loaded into the loop engine
- The user explicitly invokes `/loop-roadmap` or one of its triggers
- The user says "what should I build?" and needs structure to think through it

**When NOT to use:**

- The user already has a fully-loaded `.flywheel/roadmap.md` and only needs execution — route to `loop-run`
- The ask is a pure information request or mechanical operation
- The user needs intent extraction before they have an idea — route to `interview-me` first
- The user needs to refine an idea into concrete variations — route to `idea-refine` first

## The Process

### Step 1: Identify or confirm the project type

Before asking anything else, determine which project-type bucket this work falls into.
Present the five types with a one-line description each, and ask the user to pick or confirm your best guess:

| Type | Description | Rigor |
|------|-------------|-------|
| **application** | Software with UI, data model, and API surface | deep |
| **workflow** | Commands, hooks, skills, automations | standard |
| **client** | Client site — business context, audience, conversion | standard |
| **utility** | Small single-purpose tool | tight |
| **campaign** | Content or marketing — timeline-driven, goal-anchored | creative |

Types are extensible. Dropping a new `<type>/` directory into `references/project-types/` adds a type without changing the skill. If the user's work doesn't fit any type, default to `application` (deep rigor, safe) and note the mismatch.

### Step 2: Load the type's config and guide

From the skill's own `references/project-types/<type>/` directory, load:

- **`config.md`** — sets `rigor` (tight | standard | deep | creative), `required_sections`, and `default_phase_risk`
- **`guide.md`** — holds the interview sections, each with `Explore:` (questions) and `Suggest:` (options when the user stalls)

The `rigor` value adapts behavior:
- **tight** — moves fast, resists scope creep, runs only required sections
- **standard** — balanced, runs required sections at a normal pace
- **deep** — thorough, runs all sections, architecture matters
- **creative** — generative, always anchored to a measurable goal

The `required_sections` list determines which guide sections are mandatory. Skip optional sections unless the user brings them up.

### Step 3: Run the interview — one section at a time

Work through each `required_sections` entry from `config.md`, using the corresponding `## Section:` block from `guide.md`.

For each section:

1. **Explore** — ask one `Explore:` question at a time. Attach your best guess of the answer (the coach move from `interview-me` — reacting is faster than generating from scratch).
2. **Suggest** — only when the user stalls. Offer one `Suggest:` option with its tradeoff. Don't list all options at once; pick the one that fits the context.
3. **Capture** — distill the answer into a tight summary (1–3 sentences). Write it down before moving to the next question.
4. **Gate** — when the section has enough to fill its part of the roadmap, move on. Don't over-interview; the roadmap is a plan, not a spec.

Keep the tone conversational. You're a coach helping someone think through their project, not a checklist-ticking auditor. If a section is clearly irrelevant despite being "required" (e.g., `deployment` for a local-only tool), note the skip and why.

### Step 4: Generate the roadmap

When all required sections are covered, synthesize the captured answers into `.flywheel/roadmap.md`.

The roadmap format:

```markdown
# <Project> Roadmap

type: application          # from Step 1
rigor: deep                # from config.md

## Vision
<one paragraph: what "done" looks like, distilled from the problem section>

## Out of Scope
- <explicit non-goals — the scope guardrail>

## Milestones
### M1: <milestone name>
- [ ] P1 — <phase title>  · id: m1-p1  · risk: standard
- [ ] P2 — <phase title>  · id: m1-p2  · risk: risky
### M2: <milestone name>
- [ ] P3 — <phase title>  · id: m2-p3  · risk: tiny-fix

## Autonomy
mode: hitl                 # default; only change if user explicitly opts into autonomous
budget_per_phase: 3        # max iterations before escalating (mirrors spec-driven bound)
```

**Phase construction rules:**
- Each section's output becomes one or more phases inside a milestone
- Group related phases into named milestones (M1: Foundation, M2: Core, M3: Polish)
- Default phase risk is `standard` (from `config.md.default_phase_risk`); promote to `risky` for auth, payments, data migration, or anything user/business-facing; demote to `tiny-fix` for straightforward crud/plumbing
- Assign unique, stable phase IDs (`m1-p1`, `m1-p2`, ...) — these are the contract keys the loop engine uses
- Max 5–7 phases total. If the interview surfaced more, group the smallest ones or defer to a later milestone

**When the user provides an existing roadmap:**
If the user has a roadmap file they want to load, validate it against the contract:
1. Does it have `type:` and `rigor:` fields?
2. Does every phase have an `id:` and `risk:` annotation?
3. Are phases grouped into milestones?

If valid, adopt it (write to `.flywheel/roadmap.md`). If invalid, point out what's missing and offer to fix it via a shortened interview (run only the missing sections).

### Step 5: Write the initial state

Create `.flywheel/state.md`:

```markdown
# Flywheel State

roadmap: roadmap.md
status: active
current_phase: null        # set by loop-run when execution begins
phases_completed: 0
phases_total: <N>
mode: hitl
budget_remaining: 3
last_updated: <ISO date>
```

This is the boot file. `loop-run` reads it to know where to start.

### Step 6: Confirm and hand off

Present the roadmap to the user:

```
Here's the roadmap I've drafted:

<summary: vision + milestone count + phase count>

The full roadmap is at .flywheel/roadmap.md. State is at .flywheel/state.md.

Ready to start the first phase? Run /loop-run to begin the loop.
```

Wait for an explicit confirmation before considering the task done. If the user wants changes, iterate on the specific sections — don't redo the whole interview.

## When to Route Upstream

`loop-roadmap` assumes the user has an idea to work with. If they don't, route them upstream:

- **No idea at all** → `interview-me` — extract what they actually want before a roadmap makes sense
- **Idea is fuzzy or has competing directions** → `idea-refine` — generate concrete variations
- **Need a formal spec before building** → `spec-driven` — write acceptance criteria and verification

Return to `loop-roadmap` when there's a concrete idea to roadmap-ify.

## Coaching Principles

- **One question at a time.** Batch questions kill momentum and encourage skim-answers. The third question often depends on the answer to the first.
- **Attach a guess.** The user reacts faster to a wrong guess than they generate from scratch. Be visibly willing to be wrong.
- **Push to decision.** When the user has been circling a section, offer a concrete choice with a recommendation. A coach doesn't let the player stall indefinitely.
- **Suggest, don't prescribe.** Offer options framed as tradeoffs. "Option A gets you shipped faster but skips auth; Option B is more complete but adds a phase." Let the user decide.
- **Respect the scope guardrail.** When the user starts describing features that don't fit the type or belong in v2, gently capture them in Out of Scope. "That sounds like a great Phase 2 candidate — let's write it down so we don't lose it."

## Verification

After applying loop-roadmap:

- [ ] The project type was confirmed with the user before the interview began
- [ ] The correct `config.md` and `guide.md` were loaded for that type
- [ ] Each `required_sections` section was covered (or explicitly skipped with a reason)
- [ ] `.flywheel/roadmap.md` exists with `type:`, `rigor:`, `## Vision`, `## Out of Scope`, `## Milestones` (with phase IDs and risk classes), and `## Autonomy`
- [ ] Every phase has a unique `id:` and a `risk:` annotation
- [ ] `.flywheel/state.md` exists with `status:`, `current_phase:`, `phases_completed:`, `phases_total:`, `mode:`, and `budget_remaining:`
- [ ] The user confirmed the roadmap before the skill considered itself done
- [ ] No phase count exceeds 7 without explicit justification
