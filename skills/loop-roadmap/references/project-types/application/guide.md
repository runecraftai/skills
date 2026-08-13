# Interview Guide: application (rigor: deep)

## Section: problem            # required
Explore:
- Who is this for, and what do they do today without it?
- What's the one outcome that means this succeeded?
Suggest:
- If unsure of the user: "solo operator" vs "small team" — narrower is easier to ship.
- If the outcome is fuzzy: pick one measurable signal (a task done in <N min, a report generated).

## Section: data-model         # required
Explore:
- What are the core entities and how do they relate?
- What must persist between sessions vs. what's transient?
Suggest:
- Start with 2–3 entities max; more can be added as phases, not up front.

## Section: api-surface         # required
Explore:
- What actions does the user take? Each becomes an endpoint or command.
- What talks to the outside world (auth, payments, external APIs)?
Suggest:
- List actions as verbs; group the risky ones (auth, money) so they get `risky` phases.

## Section: ui                  # required
Explore:
- What's the first screen the user sees, and the single primary action on it?
Suggest:
- One primary action per screen; defer secondary flows to later phases.

## Section: deployment          # required
Explore:
- Local-only, or hosted? Who needs to reach it and from where?
Suggest:
- Ship local-first; add hosting as its own phase once the loop runs (mirrors §8 Q1).

## Section: out-of-scope        # required (scope guardrail)
Explore:
- What are you explicitly NOT building in v1?
Suggest:
- Anything that isn't on the path to the one success outcome goes here.
