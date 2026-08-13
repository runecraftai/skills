<p align="center">
  <a href="https://www.npmjs.com/package/@runecraft/skills"><img src="https://img.shields.io/npm/v/@runecraft/skills?label=npm&color=c9a24a" alt="npm version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-22c55e" alt="MIT License" /></a>
</p>

# Runecraft Skills

A catalog of agent skills (`SKILL.md` packages) that teach AI coding agents how to run specific, multi-phase workflows — planning, testing, review, security, deprecation, shipping — with the same precision every time, instead of ad-hoc prompting.

Each skill is a `SKILL.md` file (the core agent instructions) plus, optionally, a `references/` folder the agent loads on demand as it works through a phase, instead of front-loading everything at once. Skills are plain files you can read, diff, and version.

## Installation

The catalog is distributed as the [`@runecraft/skills`](https://www.npmjs.com/package/@runecraft/skills) npm package:

```bash
npm install @runecraft/skills
```

A dedicated installer TUI — which detects your agent, picks the right destination, and wires up slash commands — is coming in slice 2. Until then, install manually by copying the skill folder(s) you want into your agent's skills directory:

| Agent | Skills directory |
|-------|------------------|
| pi | `~/.pi/agent/skills/<skill>/` |
| Claude Code | `~/.claude/skills/<skill>/` |
| Codex | `~/.codex/skills/<skill>/` |
| OpenCode | `~/.config/opencode/skills/<skill>/` |

Example:

```bash
# after `npm install @runecraft/skills`
cp -r node_modules/@runecraft/skills/skills/spec-driven ~/.pi/agent/skills/spec-driven
```

Works with any agent that supports custom instructions, skills, or rules directories.

## Available Skills

| Skill | Version | Description | Main Trigger | Docs |
|-------|---------|-------------|--------------|------|
| **spec-driven** | 5.0.0 | Spec-driven planning with 4 adaptive phases (Specify/Design/Tasks/Execute) + independent Verifier (author≠verifier) + self-improving lessons layer | `/spec` | [→ README](skills/spec-driven/README.md) |
| **git-commit-learning** | 1.0.0 | RPI model: analyze git log for patterns and write AI-learnable commits (Research → Plan → Implement → Verify). PT/EN. | `/commit` | [→ README](skills/git-commit-learning/README.md) |
| **git-worktree** | 1.0.0 | Use git worktrees for parallel feature branches without stashing or cloning. | `/worktree` | [→ README](skills/git-worktree/README.md) |
| **using-agent-skills** | 1.0.0 | Meta-skill: discover and dispatch to the right catalog skill for the current task. | `/skill` | [→ README](skills/using-agent-skills/README.md) |
| **idea-refine** | 1.0.0 | Refine raw ideas through divergent/convergent thinking — expand options, stress-test assumptions. | `/plan` | [→ README](skills/idea-refine/README.md) |
| **interview-me** | 1.0.0 | One-question-at-a-time interview until ~95% confidence about user intent. | `/interview` | [→ README](skills/interview-me/README.md) |
| **loop-contract** | 1.0.0 | Reads the next pending roadmap phase and writes a scoped `.flywheel/contracts/<phase-id>.md` — the single source of truth the loop obeys for one phase. | `/loop-contract` | [→ README](skills/loop-contract/README.md) |
| **loop-judge** | 1.0.0 | Independent phase-level verifier (author≠verifier) with programmatic or LLM-judge gates. Emits escalation statuses with cited evidence. | `/loop-judge` | [→ README](skills/loop-judge/README.md) |
| **loop-learn** | 1.0.0 | Records phase outcomes to Flywheel memory: decisions to `decisions.md`, distilled failures to `lessons.md`. | `/loop-learn` | [→ README](skills/loop-learn/README.md) |
| **loop-roadmap** | 1.0.0 | Type-aware roadmap generation from raw ideas. Adapts interview rigor per project type, produces `.flywheel/roadmap.md` + `.flywheel/state.md`. | `/loop-roadmap` | [→ README](skills/loop-roadmap/README.md) |
| **loop-run** | 1.0.0 | Flywheel loop orchestrator. Wires SELECT→APPLY→MEASURE→JUDGE→UNIFY, driving a roadmap to completion phase-by-phase. | `/loop-run` | [→ README](skills/loop-run/README.md) |
| **memory-management** | 1.0.0 | Lightweight agent memory for non-Guild projects. Maintains project decisions and error patterns in a flat .agent-memory/ directory. | `/memory` | [→ README](skills/memory-management/README.md) |
| **doubt-driven-development** | 1.0.0 | Adversarial review of non-trivial decisions: CLAIM → EXTRACT → DOUBT → RECONCILE → STOP. | `/harden` | [→ README](skills/doubt-driven-development/README.md) |
| **test-driven-development** | 1.0.0 | TDD with the 80/15/5 pyramid and Beyonce Rule. Fail first, then make it pass. | `/test` | [→ README](skills/test-driven-development/README.md) |
| **typescript-patterns** | 1.0.0 | TypeScript best practices and patterns for type-safe, maintainable code. | `/typescript` | [→ README](skills/typescript-patterns/README.md) |
| **debugging-and-error-recovery** | 1.0.0 | Five-step root-cause triage: reproduce → localize → reduce → fix → guard. | `/debug` | [→ README](skills/debugging-and-error-recovery/README.md) |
| **code-review-and-quality** | 1.0.0 | Five-axis code review (correctness, readability, architecture, security, performance) with severity labels. | `/review` | [→ README](skills/code-review-and-quality/README.md) |
| **code-simplification** | 1.0.0 | Reduce complexity while preserving behavior — Chesterton's Fence, Rule of 500. | `/simplify` | [→ README](skills/code-simplification/README.md) |
| **security-and-hardening** | 1.1.0 | OWASP Top 10 and a three-tier boundary system for security-first development. | `/security` | [→ README](skills/security-and-hardening/README.md) |
| **deprecation-and-migration** | 1.0.0 | Retire old systems, APIs, and features; migrate users safely. Treats code as liability. | `/deprecate` | [→ README](skills/deprecation-and-migration/README.md) |
| **shipping-and-launch** | 1.0.0 | Pre-launch checklist, staged rollout, feature flag lifecycle, monitoring, rollback. | `/ship` | [→ README](skills/shipping-and-launch/README.md) |
| **skill-forge** | 1.0.0 | Meta-skill for creating new Agent Skills end-to-end. Aligned with the open SKILL.md format. 6-phase workflow (Discover → Design → Author → Validate → Optimize → Deliver) with bundled validator and trigger/output eval methodology. | `/forge` | [→ README](skills/skill-forge/README.md) |
| **linkedin-audit** | 1.0.0 | Audita o perfil do LinkedIn (notas 0-10 em 8 seções, diagnósticos diretos, reescritas sugeridas) e gera um dashboard HTML standalone com as cores do LinkedIn. | "avalia meu perfil", "audita meu LinkedIn" | [→ README](skills/linkedin-audit/SKILL.md) |

## References

Shared documents that complement the per-skill workflows:

| File | Description |
|------|-------------|
| [testing-patterns.md](references/testing-patterns.md) | Common testing patterns across the stack with 80/15/5 pyramid, Beyonce Rule, and 8 anti-patterns. |
| [definition-of-done.md](references/definition-of-done.md) | Project-wide standing bar that complements per-task acceptance criteria. |

## Why a SKILL.md instead of a longer system prompt

A system prompt has to hold everything all the time, so it either stays generic or grows until it's expensive and hard to steer. A skill is loaded only when its trigger matches the task, and it's a plain file you can read, diff, and version — the same TDD process doesn't need to be re-explained by hand in every project's prompt.

## How it works

```text
@runecraft/skills/
├── skills/
│   ├── spec-driven/SKILL.md          # one directory per skill
│   ├── test-driven-development/SKILL.md
│   ├── code-review-and-quality/SKILL.md
│   └── ...                           # each with SKILL.md + optional references/ + scripts/
└── references/                       # shared docs: testing-patterns.md, definition-of-done.md
```

## License

MIT
