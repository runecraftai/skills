<p align="center">
  <img src="./assets/readme/grimoire-flow.svg" width="100%" alt="Grimoire discovers agent skills from categories or project detection, then installs them for your coding agent">
</p>

<h1 align="center">Grimoire</h1>

<p align="center">A curated skill catalog and safe installer for coding agents.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@runecraft/grimoire"><img src="https://img.shields.io/npm/v/@runecraft/grimoire?color=6874ff&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@runecraft/grimoire"><img src="https://img.shields.io/npm/dm/@runecraft/grimoire?color=58d6b0&label=downloads" alt="monthly npm downloads"></a>
  <a href="https://github.com/runecraftai/skills/actions/workflows/ci.yml"><img src="https://github.com/runecraftai/skills/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <a href="https://github.com/runecraftai/skills/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-f0b86e" alt="MIT license"></a>
</p>

Grimoire puts reusable `SKILL.md` workflows in the right place for your agent. Browse by category, detect what your project needs, choose skills, and confirm before anything is installed.

## Start here

```bash
npx @runecraft/grimoire
# or
bunx @runecraft/grimoire
```

The interactive flow is the default. Choose a category to expand it, use space to toggle skills, and press Backspace or ArrowLeft to return to the category list while keeping your choices. Revisit categories before continuing; selected skills are installed after you choose a destination and confirm installation.

## Supported agents

- [Pi](https://github.com/badlogic/pi-mono)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
- [Codex CLI](https://github.com/openai/codex)
- [OpenCode](https://opencode.ai/)

## Commands

```bash
grimoire list                              # list catalog entries
grimoire search typescript                 # search names, descriptions, and categories
grimoire detect                            # recommend skills for this project
grimoire install -s spec-driven -t pi       # install without the TUI
grimoire install -s skill-forge -t codex --overwrite
```

The executable is `grimoire`. Run `grimoire --help` for all options. Repeat `-s` to install multiple skills; use `--target-dir` for an isolated destination.

## Available skills

The catalog is the source of truth for these categories; descriptions below come from each skill's `SKILL.md` metadata.

| Category | Skill | Description |
| --- | --- | --- |
| Agent Skills | `skill-forge` | Designs, authors, validates, and optimizes new Agent Skills. |
| Agent Skills | `using-agent-skills` | Discovers and invokes the right Grimoire skill for a task. |
| Agent Skills | `memory-management` | Maintains lightweight project decisions and error-pattern memory. |
| Code Quality & Testing | `code-review-and-quality` | Reviews correctness, readability, architecture, security, and performance with severity labels. |
| Code Quality & Testing | `test-driven-development` | Drives implementation with failing tests first, then passing tests and refactoring. |
| Code Quality & Testing | `doubt-driven-development` | Applies adversarial review to non-trivial decisions before they stand. |
| Code Quality & Testing | `debugging-and-error-recovery` | Guides systematic reproduce, localize, reduce, fix, and guard debugging. |
| Code Quality & Testing | `typescript-patterns` | Covers type-safe TypeScript patterns including unions, generics, and narrowing. |
| Code Quality & Testing | `code-simplification` | Simplifies code for clarity while preserving exact behavior. |
| Delivery & Repository | `shipping-and-launch` | Prepares production launches with rollout, monitoring, and rollback planning. |
| Security & Reliability | `security-and-hardening` | Hardens code against vulnerabilities using OWASP and boundary-focused practices. |
| Delivery & Repository | `git-worktree` | Uses isolated Git worktrees for parallel feature branches. |
| Delivery & Repository | `git-commit-learning` | Extracts reusable project lessons from Git history and commits. |
| Delivery & Repository | `deprecation-and-migration` | Manages deprecation and migration of old systems, APIs, and features. |
| Planning & Specification | `spec-driven` | Plans and implements work through adaptive specification, design, tasks, and execution phases. |
| Planning & Specification | `spec-loop` | Executes specification artifacts milestone by milestone with verification gates. |
| Planning & Specification | `idea-refine` | Turns raw ideas into sharp, actionable concepts through divergent and convergent thinking. |
| Planning & Specification | `interview-me` | Extracts underlying intent through a focused one-question-at-a-time interview. |
| Professional Development | `linkedin-audit` | Audits LinkedIn profiles with scored sections, diagnostics, rewrites, and a dashboard. |

## Why Grimoire

- **One catalog:** skills are organized into Agent Skills, Code Quality & Testing, Delivery & Repository, Planning & Specification, Security & Reliability, and Professional Development.
- **Project-aware:** detection reads common project files and recommends relevant skills.
- **Explicit installs:** existing skills are skipped by default; conflicts require an overwrite choice or `--overwrite`.
- **Trackable work:** project installs can be recorded in `.grimoire-lock.json`.

## Development

```bash
bun install
bun run lint
bun run test
bun run typecheck
bun run build
npm pack --dry-run --workspace @runecraft/grimoire
```

## License

MIT — see [LICENSE](LICENSE).
