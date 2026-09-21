---
name: idea-discovery
description: >
  Interviews an unshaped idea into a verdict plus a design document (decisions, flows, schema,
  contracts) that someone else can plan from without having been in the room. Refuses to converge
  early; has a verdict gate that decides whether to build at all. Use when the user says "research
  this", "help me understand this problem", "should we build this", "discovery", "explore this
  problem", "figure out if we should do X", or "idea discovery". Do NOT use to cut a finished
  design into tasks (use task-cutting), to implement (use verified-implementation), or to refine
  an already-understood idea (use idea-refine).
license: CC-BY-4.0
metadata:
  version: 1.0.0
  author: Tech Leads Club - github.com/tech-leads-club
  upstream: "tech-leads-club/agent-skills (CC-BY-4.0, Copyright Tech Leads Club)"
---

# Idea Discovery

Find out where this project actually is. Understand the problem. Decide whether to solve it. Then, and only then, decide how.

```
SITUATION ────→ PROBLEM ───────→ VERDICT ───────→ DECIDE
(where this     (no solution     (a stop, or a    (two shapes, costed
 project is)     proposed yet)    record)          against this repo)
```

These are prerequisite order, not a script. The failure that matters here is not inventing a fact — it is **converging early**: proposing a solution on turn two, hearing "sure", and manufacturing a decision that has all the authority of one and none of the examination.

The artifact is a design document anyone can plan from without having been in the conversation. It shows the design, not only records that one was made: hard-to-reverse decisions, critical-path flow, states and who moves them, schema as it will exist, contracts callers will hold. Organised by vertical slice so a reader who wants one piece finds its diff, flow, schema, contract, decisions and open questions in one section.

## When to Use

- Someone has an idea but nobody has decided whether to build it
- A feature was requested and the problem behind it is unclear
- A project has not shipped and there is no "today" to measure
- You need to recover the problem from a proposed solution
- The team is about to commit resources and the case has not been examined

## Critical rules

1. **No technology is proposed before the verdict.** What the project already runs is a constraint, not a proposal. Knowing is allowed; proposing is not.
2. **The verdict is a stop wherever the decision is open.** Present it and wait. Where someone already committed, record it — do not manufacture a gate whose answer you know.
3. **Never present an option you would not ship.** Two shapes are considered every time; the second earns a section only when it is live.
4. **Name the number that would change the decision before you go and get it.** Data with no question attached is noise. A missing number is usually a finding about instrumentation, not the problem.
5. **A decision without a concrete value is not decided.** Catch it here where it is cheap.
6. **High impact plus low clarity does not get decided here.** It becomes an RFC or a spike.
7. **Solve for this context, not for the reference architecture.** The recommendation is the smallest shape that answers the problem as measured.

## The interview

Ask what is answerable now. Every question whose prerequisites are settled is fair; one whose prerequisite is still open is not. **You are done when nothing answerable is left**, not when all sections have been visited. Nothing is owed a paragraph merely because it exists.

**Every question carries your recommended answer and the reason, in a line.** Agreeing costs a word, disagreeing costs a sentence. A question you have no recommendation for is usually one to look up instead.

**Facts you look up; decisions you ask.** Keep delivery small: one question when answers depend on each other, two when they do not.

**Some questions cannot be answered by talking at all.** Route them to a spike or a designer. That routing is a result, not a failure.

## Situation

Three facts decide which questions are worth asking:

- **Where this project is.** A shipped product has a measurable today. One that has not shipped has none — cost-of-today questions return nothing four times.
- **Whether the decision is open.** Sometimes nobody decided and that is why this exists. Sometimes a roadmap already committed and the honest job is to record who.
- **What is already in flight that this touches.** Active branches, the open cycle in the tracker, connected design documents. Depend on none existing.
- **What is at stake.** Not how long — how expensive to be wrong.

**Some work does not need a discovery at all.** Where little is at stake, reversible in an afternoon, and nobody disagrees, give the recommendation in a paragraph and stop. A discovery that cannot decline the feature is a rubber stamp; one that cannot decline itself is paperwork.

## Problem

Nothing technical happens here. People arrive holding a solution; the first job is to recover the problem it was an answer to.

**Decide which kind of problem this is** — the questions differ:

- **Pain**: who hurts, named; what it costs today in a unit the business feels; what happens if nothing changes.
- **Absence**: who cannot do this today, and — the whole phase — **what do they do instead**. The substitute is the evidence.
- **Construction**: what this piece was promised to make possible; what stalls without it; why now rather than after the next piece.

Never run one kind's questions over another. A problem of absence has no "what breaks if we do nothing" — nothing breaks, that is what absence means.

**Before fetching anything, say which number would change the decision.** Then get that one. A missing number is not evidence of anything — ask, never infer.

**Walk the actual journey.** Not as a diagram — the states that matter and what should happen in each. Empty, first time, retry, half-finished, expired, unauthorised, the one where the user walks away. These are product edge cases (what should happen), not engineering cross-cutting concerns.

**Widen the solution space once, here, before the verdict.** What would remove the cost without building what was proposed? Changing a default, removing the step, buying it. Most get discarded in a line — that is the point.

## Verdict

Four outcomes, all real: **build**, **build something smaller or different**, **not now**, **do not build**.

**Declining is also a bet.** "Not now" and "do not build" carry their own case — what it costs to stay as we are — in the same units as the cost of doing something. Where one side is engineering weeks and the other is adjectives, the adjectives lose.

State it with the reason. Then **stop**. The user confirms before a single technical option is discussed. This is the gate.

**What counts as worked.** In the problem's own unit. "Shipped" is not success — it is the thing you already agreed to do. Three lines: **Worked if**, **Early signal** (visible in days, plus what failure looks like), **Review** (date or trigger, who looks).

If the verdict is **not now** or **do not build**, the document is `Status: declined` with the reason, Situation, Problem and Boundary. Do not invent Shape or slices for work you just declined.

## Decide

**Open the repository before proposing anything.** An option is not a design — it is a design plus what it costs here.

**Churn says how much it costs to be wrong.** A one-way door in a file touched twice a year is cheap to get wrong; the same in a file touched every week is a bill arriving weekly. Read conventions as precedence, not cost.

**Prior art: name what a benchmark would change before you go and look.** Three things carry back: the shape that repeats (convergence is evidence), the failure everybody reports (cheapest item), and what turned out to be unnecessary.

**Two shapes.** First: the obvious one, best value-to-effort. Second: more robust, more expensive — pay now or pay later. Each carries the condition under which it wins. The lighter holds the recommendation; the heavier has to take it.

**The document holds fundamental decisions and nothing the plan can derive.** Each decision stated once, at the highest level. Identifier ceiling: route, table, column, class, glossary term. What will exist, not what will be done.

**Slices** are staffable verticals — the record, the operation, the screen. Five to eight typical. Named by domain term or code identifier. Each carries its state table (acceptance criteria), schema where it creates a table, flow where it holds a one-way door, contract (one line per endpoint). Key decisions sit above the index, five to eight in prose.

**Stop-deciding grid**: high impact + clear = decide; high impact + unclear = RFC or spike; low impact + clear = one line; low impact + unclear = sensible default.

## Output

Produce the artifact unless Situation concluded there is nothing to discover, in which case produce the paragraph. Read `references/document-format.md` when writing the `.design/<name>.md` artifact. Never narrate the phase. State conclusions definitively. Cut filler and hedging.

### Example 2: Already committed

User says: "We already decided to build billing. Help me figure out the shape."

1. Record the committed decision in Situation. Do not restage the verdict.
2. Interview journey states and evidence that still affect shape.
3. Open the repository before proposing. Two shapes, costed. Design with the critical-path flow, the state machine and the schema.

Result: Verdict line is "already committed — see Situation". Anyone can plan from it without the conversation.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We already know what to build" | Then the verdict is a record, not a gate — record it and skip to shape. But verify the problem section still holds. |
| "This is too small for discovery" | Cheap to reverse, small blast radius, nobody disagreeing — all three at once and you can skip. Any one missing and the session runs. |
| "Let's just build it and see" | The verdict gate exists because building is the expensive path. A paragraph now saves weeks of building the wrong thing. |
| "The user already gave requirements" | Requirements are solutions. Recover the problem they answer, or you are comparing two solutions to an unnamed problem. |

## Red Flags

- Proposing technology before the verdict
- Verdict section that is longer than one line in the document
- A "cheaper than building" section that was skipped
- Journey states that only cover the happy path
- Options that do not carry a win condition
- A design that names methods or file paths
- Slices organised by kind of view instead of by vertical

## Verification

After completing discovery:

- [ ] Situation records where the project is, whether the decision is open, what is in flight, and what is at stake
- [ ] Problem section names the kind (pain/absence/construction) and carries the number that moved the decision
- [ ] Verdict is stated with the reason, in the problem's own units
- [ ] Two shapes carry conditions under which each wins
- [ ] Design is organised by vertical slice, not by view
- [ ] Key decisions are five to eight, each stated once, each hard to reverse
- [ ] No identifier below route, table, column, class appears in the design

## See Also

- `task-cutting` — turns the design document this skill produces into tasks a builder can act on
- `idea-refine` — stress-tests an already-understood idea through divergent/convergent thinking
- `interview-me` — structured one-question-at-a-time extraction of intent
- `spec-driven` — full pipeline from specify through execute
