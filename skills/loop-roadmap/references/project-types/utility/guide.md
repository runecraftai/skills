# Interview Guide: utility (rigor: tight)

## Section: problem             # required
Explore:
- What's the single repetitive task this tool replaces?
- Who runs it, and what's the friction today?
Suggest:
- If the problem statement is longer than two sentences, it's probably not a utility.
- Frame it as "I do X manually; this tool does X automatically."

## Section: scope               # required
Explore:
- What are the exact inputs and outputs?
- What are the two or three most frequent paths through this tool?
Suggest:
- Define scope as "one command/action in, one result out" — resist config files and flags.
- If the user starts describing a second feature: make it a separate phase with its own contract.

## Section: out-of-scope        # required (scope guardrail)
Explore:
- What would expand this beyond a utility? (persistence, multi-user, UI, scheduling)
Suggest:
- Any of those expansions means the project type is wrong — suggest reclassifying to `application` or `workflow`.
- A utility that ships in one session is a win; everything else is scope creep.
