---
name: using-agent-skills
description: >
  Discovers and invokes the right @runecraft/skills skill for the current task.
  Use when starting a session, when a request is ambiguous about which workflow to apply,
  or when you need to pick among the 23-skill Runecraft catalog.
  EN triggers: /skill, which skill, pick a skill, what skill should I use, skill discovery, meta skill.
  PT triggers: qual skill, qual habilidade, descobrir skill, qual fluxo usar.
  Do NOT use for: actual implementation work (route to the specific skill instead), unrelated
  standalone tasks outside the Runecraft catalog, or runtime-specific configuration (e.g.,
  opencode.json / Claude Code plugin paths).
license: CC-BY-4.0
---

# Using Agent Skills

## Overview

Agent Skills is a collection of engineering workflow skills organized by development phase. Each skill encodes a specific process that senior engineers follow. This meta-skill helps you discover and apply the right skill for your current task.

## Skill Discovery

When a task arrives, identify the development phase and apply the corresponding skill:

```
Task arrives
    │
    ├── Don't know what you want yet? ──────→ interview-me
    ├── Have a rough concept, need variants? → idea-refine
    ├── New project/feature/change? ────→ spec-driven
    ├── Implementing code? ─────────────→ spec-driven
    │   ├── TypeScript code? ──────────→ typescript-patterns
    │   ├── Stakes high / unfamiliar code? ──→ doubt-driven-development
    │   └── Driving a Flywheel loop? ───→ loop-run
    │       ├── Generate/validate roadmap? → loop-roadmap
    │       ├── Write a phase contract? ────→ loop-contract
    │       ├── Verify a phase? ───────────→ loop-judge
    │       └── Record phase outcomes? ─────→ loop-learn
    ├── Writing/running tests? ─────────→ test-driven-development
    ├── Something broke? ───────────────→ debugging-and-error-recovery
    ├── Reviewing code? ────────────────→ code-review-and-quality
    │   ├── Too complex? ──────────────→ code-simplification
    │   └── Security concerns? ────────→ security-and-hardening
    ├── Deprecating/migrating? ─────────→ deprecation-and-migration
    ├── Deploying/launching? ───────────→ shipping-and-launch
    ├── Git work? ─────────────────────→ git-worktree
    │   └── Mining history for knowledge? → git-commit-learning
    ├── Project memory for the agent? ──→ memory-management
    ├── Creating a new skill? ──────────→ skill-forge
    └── LinkedIn profile audit? ────────→ linkedin-audit
```

## Core Operating Behaviors

These behaviors apply at all times, across all skills. They are non-negotiable.

### 1. Surface Assumptions

Before implementing anything non-trivial, explicitly state your assumptions:

```
ASSUMPTIONS I'M MAKING:
1. [assumption about requirements]
2. [assumption about architecture]
3. [assumption about scope]
→ Correct me now or I'll proceed with these.
```

Don't silently fill in ambiguous requirements. The most common failure mode is making wrong assumptions and running with them unchecked. Surface uncertainty early — it's cheaper than rework.

### 2. Manage Confusion Actively

When you encounter inconsistencies, conflicting requirements, or unclear specifications:

1. **STOP.** Do not proceed with a guess.
2. Name the specific confusion.
3. Present the tradeoff or ask the clarifying question.
4. Wait for resolution before continuing.

**Bad:** Silently picking one interpretation and hoping it's right.
**Good:** "I see X in the spec but Y in the existing code. Which takes precedence?"

### 3. Push Back When Warranted

You are not a yes-machine. When an approach has clear problems:

- Point out the issue directly
- Explain the concrete downside (quantify when possible — "this adds ~200ms latency" not "this might be slower")
- Propose an alternative
- Accept the human's decision if they override with full information

Sycophancy is a failure mode. "Of course!" followed by implementing a bad idea helps no one. Honest technical disagreement is more valuable than false agreement.

### 4. Enforce Simplicity

Your natural tendency is to overcomplicate. Actively resist it.

Before finishing any implementation, ask:
- Can this be done in fewer lines?
- Are these abstractions earning their complexity?
- Would a staff engineer look at this and say "why didn't you just..."?

If you build 1000 lines and 100 would suffice, you have failed. Prefer the boring, obvious solution. Cleverness is expensive.

### 5. Maintain Scope Discipline

Touch only what you're asked to touch.

Do NOT:
- Remove comments you don't understand
- "Clean up" code orthogonal to the task
- Refactor adjacent systems as a side effect
- Delete code that seems unused without explicit approval
- Add features not in the spec because they "seem useful"

Your job is surgical precision, not unsolicited renovation.

### 6. Verify, Don't Assume

Every skill includes a verification step. A task is not complete until verification passes. "Seems right" is never sufficient — there must be evidence (passing tests, build output, runtime data).

Per-skill verification is the local check. The project-wide bar that applies to *every* change, regardless of which skill is active, is the Definition of Done: tests pass, no regressions, behavior verified at runtime, docs updated. See `references/definition-of-done.md`. It complements each task's acceptance criteria rather than replacing them.

## Failure Modes to Avoid

These are the subtle errors that look like productivity but create problems:

1. Making wrong assumptions without checking
2. Not managing your own confusion — plowing ahead when lost
3. Not surfacing inconsistencies you notice
4. Not presenting tradeoffs on non-obvious decisions
5. Being sycophantic ("Of course!") to approaches with clear problems
6. Overcomplicating code and APIs
7. Modifying code or comments orthogonal to the task
8. Removing things you don't fully understand
9. Building without a spec because "it's obvious"
10. Skipping verification because "it looks right"

## Skill Rules

1. **Check for an applicable skill before starting work.** Skills encode processes that prevent common mistakes.

2. **Skills are workflows, not suggestions.** Follow the steps in order. Don't skip verification steps.

3. **Multiple skills can apply.** A feature implementation might involve `idea-refine` → `spec-driven` → `test-driven-development` → `code-review-and-quality` → `code-simplification` → `shipping-and-launch` in sequence.

4. **When in doubt, start with a spec.** If the task is non-trivial and there's no spec, begin with `spec-driven`.

## Lifecycle Sequence

For a complete feature, the typical skill sequence is:

```
1.  interview-me                → Extract what the user actually wants
2.  idea-refine                 → Refine vague ideas
3.  spec-driven                 → Specify, design, and break into verifiable chunks
4.  doubt-driven-development    → Cross-examine non-trivial decisions in-flight
5.  test-driven-development     → Prove each slice works
6.  code-review-and-quality     → Review before merge
7.  code-simplification         → Reduce unnecessary complexity while preserving behavior
8.  deprecation-and-migration   → Retire old systems and move users safely when needed
9.  shipping-and-launch         → Deploy safely
```

Not every task needs every skill. A bug fix might only need: `debugging-and-error-recovery` → `test-driven-development` → `code-review-and-quality`.

## Quick Reference

| Phase | Skill | One-Line Summary |
|-------|-------|-----------------|
| Define | interview-me | Surface what the user actually wants before any plan, spec, or code exists |
| Define | idea-refine | Refine ideas through structured divergent and convergent thinking |
| Define | spec-driven | Specify, design, and break work into verifiable tasks before code |
| Build | typescript-patterns | Type-safe, maintainable TypeScript patterns |
| Build | doubt-driven-development | Adversarial fresh-context review of every non-trivial decision |
| Verify | test-driven-development | Failing test first, then make it pass |
| Verify | debugging-and-error-recovery | Reproduce → localize → fix → guard |
| Review | code-review-and-quality | Five-axis review with quality gates |
| Review | code-simplification | Preserve behavior while reducing unnecessary complexity |
| Review | security-and-hardening | OWASP prevention, input validation, least privilege |
| Ship | deprecation-and-migration | Remove old systems and migrate users safely |
| Ship | shipping-and-launch | Pre-launch checklist, monitoring, rollback plan |
| Git | git-worktree | Parallel feature branches in isolated worktrees |
| Git | git-commit-learning | Mine git history into reusable project memory |
| Memory | memory-management | Project decisions and error patterns in `.agent-memory/` |
| Loop | loop-run | Flywheel orchestrator: SELECT→APPLY→MEASURE→JUDGE→UNIFY |
| Loop | loop-contract | Produce phase contracts from the roadmap |
| Loop | loop-judge | Independent phase-level verification |
| Loop | loop-learn | Append phase outcomes to Flywheel memory |
| Loop | loop-roadmap | Type-aware roadmap generation and validation |
| Meta | using-agent-skills | Discover and route to the right skill (this skill) |
| Meta | skill-forge | Design, author, and validate new Agent Skills |
| Domain | linkedin-audit | LinkedIn profile analysis with 0-10 scores and HTML dashboard |
