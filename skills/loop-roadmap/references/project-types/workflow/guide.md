# Interview Guide: workflow (rigor: standard)

## Section: problem             # required
Explore:
- What manual step or gap does this automation close?
- Who runs it, and how often?
Suggest:
- Frame the problem as "every time X happens, someone does Y, and that's slow/wrong."
- If the trigger is unclear: daily, event-driven, or on-command?

## Section: trigger-events      # required
Explore:
- What event or signal kicks off this workflow?
- Is it a schedule (cron), a hook (webhook/git hook), or a user command?
Suggest:
- Start with one trigger type; chaining triggers is a separate phase.
- If unsure: a CLI command is the safest default — testable and explicit.

## Section: integrations        # required
Explore:
- What systems, APIs, or tools does this workflow talk to?
- What credentials or auth does each require?
Suggest:
- List each integration with its read/write scope; group integrations that share a platform (e.g., GitHub + Actions).

## Section: out-of-scope        # required (scope guardrail)
Explore:
- What are you explicitly NOT automating in v1?
Suggest:
- Anything that needs human judgment (approval, review) stays manual until P2+.
- Edge cases that happen <5% of the time are phase 2.
