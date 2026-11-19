# @runecraft/grimoire

## 3.0.0

### Major Changes

- 046cf86: Absorb `task-cutting` into `spec-driven` and give the two shared rubrics one owner each.

  **Breaking for catalog consumers:** the `task-cutting` skill id is removed. A project whose `.grimoire-lock.json` records `task-cutting` gets `unknown skill` from `grimoire install` and loses update and audit coverage until it installs `spec-driven` instead. That is why this release is a major bump.

  - **`task-cutting` → `spec-driven`**: the surface walk, the nine-dimension sweep, the one-way-door table, the Cut → Ground → Write mechanism, the task-document format (now `spec-driven/references/document-format.md`) and the Cut-only path are all part of the Tasks phase. `spec-driven` also keeps its independent Verifier, discrimination sensor, `STATE.md` decisions and lessons layer.
  - **Nine-dimension rubric (one owner)**: `spec-driven/references/document-format.md` § Canonical rubric is the only place the nine keys and their landing kinds are written; `specify.md`, `verified-implementation/SKILL.md` and `verified-implementation/references/checklist-format.md` point at it.
  - **Interview protocol (one owner)**: `interview-me` keeps the protocol; `idea-discovery` defers to it instead of restating it.
  - **One grain rule**: `task-cutting`'s "a slice is one observable outcome, never a layer" replaces `spec-driven`'s per-function/per-file rule and its XS–XL file-count sizing, which contradicted it.
  - **Entrypoint stays readable**: the absorbed mechanism lives in `spec-driven/references/cut.md`, with summary and pointers in `SKILL.md`, so `spec-driven` stays under the MCP `read_skill` response ceiling; `@runecraft/grimoire-mcp` now covers that ceiling against the published catalog in its tests.

  Removed skill folder: `task-cutting`. Updated `catalog.json`, the README table, and cross-references in `idea-discovery` and `verified-implementation`.

### Minor Changes

- 802c1a3: Add the `feature-parity` skill: a `features.csv` ledger evaluator that scores how much of a target product a rebuild reproduces and exits `1` when a must-have feature is not `yes`, `2` on an invalid ledger.
- 83a317e: Add the `knowledge-pass` skill for code-grounded implementation handoffs and one-question-at-a-time understanding checks.
- 511a6c4: Extend skill-forge with forward-link checks, bounded script self-tests, published trigger collision warnings, prerequisite presence, and artifact ownership declarations. Add good/bad regression fixtures and catalog-wide CI and catalog-release validation with an explicit four-finding legacy baseline.

### Patch Changes

- 363be96: Rewrite the task-cutting material that `spec-driven` absorbed in this catalog's own words, and drop the upstream credit it carried:

  - **Rewritten:** `spec-driven/references/cut.md` (Cut → Ground → Walk the surfaces → Sweep the nine → Write, the refuse-rather-than-guess criterion tests, the question rules, the hand-off checks, red flags and rationalizations), the explanatory prose and template guidance in `spec-driven/references/document-format.md`, the `SKILL.md` § Tasks — the cut summary and Critical Rules 5–9, and the § Grain paragraph in `references/tasks.md`.
  - **Behaviour unchanged:** every rule, warning, threshold and stopping condition is still present. The task-document schema is byte-identical: section headings, table columns, landing kinds, the three `Unresolved` kinds and the slice-heading weight. The five-surface table and the nine-dimension rubric are also unchanged.
  - **Metadata:** the `spec-driven` description is lightly reworded, so `task cutting` and `spec driven` keep routing to it; `6.0.0` becomes `6.0.1` in `SKILL.md` and `.skill-meta.json`.
  - **Attribution:** the `tech-leads-club/agent-skills` `tlc-plan` upstream credit on the absorbed `task-cutting` section is removed, because that text is no longer external.

## 2.0.1

### Patch Changes

- de8d661: Bound `search_skills` responses within the MCP byte ceiling instead of throwing, and make shared skill ranking stopword-aware with whole-word description/category matching.

## 2.0.0

### Major Changes

- 8d2b0ca: Make the no-argument CLI a full-screen OpenTUI catalog and require Node >=26.4.0 with FFI or Bun >=1.3.0.

### Minor Changes

- 3a15062: Consolidate three overlapping skills into their canonical targets:

  - **`spec-driven-development` → `spec-driven`**: Merged gated workflow, capability mapping, detailed spec structure (six core areas), and success criteria into the Specify phase.
  - **`planning-and-task-breakdown` → `spec-driven`**: Merged dependency-graph mapping, vertical slicing, task sizing guidelines (XS–XL), output file conventions, and checkpoint strategy into the Tasks phase.
  - **`git-workflow-and-versioning` → `git-commit-learning`**: Merged trunk-based development, atomic commits, branching strategy, worktrees, save point pattern, change summaries, pre-commit hygiene, generated file handling, git debugging, semantic versioning, tagging, and changelog best practices.

  Removed skill folders: `spec-driven-development`, `planning-and-task-breakdown`, `git-workflow-and-versioning`.

- 384c1e0: Improve legacy-lock interoperability and TUI presentation:

  - **Legacy lock dual-read:** the TUI reads legacy lock entries but never overwrites shared `targets`, `fileHashes`, `hash`, `version`, or `installed` fields; verified installs are recorded additively in scoped `tuiTargets` records only.
  - **Scoped ownership records:** status and audit verify scoped `tuiTargets` records, and scoped removals drop a skill entry only when ownership is fully gone while preserving shared legacy fields and surviving copies.
  - **Ownership-unknown reporting:** `status` and `audit` report legacy and targetless copies as ownership-unknown instead of tampered or omitted; `audit --json` includes the new `ownershipUnknown` field.
  - **TUI banner:** new banner art with a compact fallback and common-width alignment, plus a raised confirm gate requiring 80x22 for safe confirmation rendering.

### Patch Changes

- 2f4cd2f: Clear stale targetless legacy ownership claims after scoped removals.
- f80f11e: Prune stale legacy ownership when removal leaves no copy in either resolved scope.

## 1.1.1

### Patch Changes

- d49f8e1: Refine category navigation UX: backspace/arrow-left back navigation, visual selected-state indicators, skill-only checkboxes

## 1.1.0

### Minor Changes

- dd4ab3b: Add category-first catalog navigation with persistent checkbox selection, refined category taxonomy, and complete README documentation table

## 1.0.0

### Major Changes

- d0d8f8d: Consolidate the catalog and installer into the unified Grimoire product with categorized browsing and project detection.

## 0.19.1

### Patch Changes

- fix(installer): make the non-TTY guard self-documenting — the interactive-mode error now shows a copy-pasteable scripting command (`bunx @runecraft/skills install -s <skill> -t <target>`), and the README quick start states that `install` is an interactive TUI needing a terminal, pointing scripts/CI users at the scripting form. Fixes the stale `tdd` example in `--help` (now `test-driven-development`) and adds a regression test proving scripting mode installs a real catalog skill without a TTY

## 0.19.0

### Minor Changes

- feat(skills): replace the five Flywheel `loop-*` skills (`loop-contract`, `loop-judge`, `loop-learn`, `loop-roadmap`, `loop-run`) with `spec-loop` — the milestone-loop runner that drives `.specs/` artifacts to completion (ROADMAP → milestones → tasks → verification gates → atomic commits → STATE.md). Removes the unused `.flywheel/` engine family; catalog routing (using-agent-skills) and the README table now point loop work at `spec-loop` / `spec-driven`

## 0.18.0

### Minor Changes

- feat(installer): add the `install` subcommand — `npx @runecraft/skills install` / `bunx @runecraft/skills install` now run the installer directly. Bare invocation keeps working (install stays the default command), `--skill`/`--target`/`--list`/`--target-dir`/`--overwrite` behave exactly as before, and `--help` documents the subcommand
- docs: redesign the repository README (hero + how-it-works SVG assets under `assets/readme/`, `npx`/`bunx` install as the primary path)

## 0.17.0

### Minor Changes

- feat(installer): add the interactive installer TUI (slice 2) — `runecraft-skills` bin, built with Bun + TypeScript + clack. Lists the catalog, multi-selects skills, picks a target agent (pi / claude / codex / opencode, each resolved to its own skills directory), and copies skill folders into place with skip/overwrite conflict handling
- feat(installer): support scripting via `--skill <name> --target <id>` (repeatable `--skill`), plus `--list`, `--target-dir` override, and `--overwrite`
- chore: bump engines to `node >=20.12.0` (required by @clack/prompts); add `bun test` suite for target resolution, catalog listing, and install-copy logic (temp dirs only)

## 0.16.0

### Minor Changes

- feat: rename package from `@runecraft/spells` to `@runecraft/skills` — the Runecraft agent-skill catalog now lives at github.com/runecraftai/skills, published as [`@runecraft/skills`](https://www.npmjs.com/package/@runecraft/skills)
- feat: add `linkedin-audit` skill (profile audit with scores, diagnostics, suggested rewrites, and a standalone HTML dashboard)

## 0.15.0

### Minor Changes

- feat(spells): add deterministic harness scripts for debugging and migration skills

## 0.14.0

### Minor Changes

- feat(spells): add skill-forge meta-skill for creating Agent Skills

## 0.13.0

### Minor Changes

- feat(summon): expose install-commands as TUI menu action

## 0.12.0

### Minor Changes

- feat(spells): bump spec-driven to v5.0.0 — 4 phases + Verifier + lessons layer
  fix(spells): replace relative README links with absolute GitHub URLs

## 0.11.0

### Minor Changes

- feat(spells): port 11 skills and 2 references from upstream agent-skills

## 0.10.0

### Minor Changes

- feat: add guild orchestration package
  feat: set up changeset-publish workflow for monorepo versioning and npm publishing
  fix(spec-driven): resolve arbiter findings — add MAP/INIT phases to meta, clarify scope thresholds
  fix(summon): fix postinstall crash blocking npx usage (v0.0.8)
  fix(spec-driven): skill-architect compliance — frontmatter, dispatch, error handling

## 0.9.0

### Minor Changes

- feat: add guild orchestration package
  feat: set up changeset-publish workflow for monorepo versioning and npm publishing
  fix(spec-driven): resolve arbiter findings — add MAP/INIT phases to meta, clarify scope thresholds
  fix(summon): fix postinstall crash blocking npx usage (v0.0.8)
  fix(spec-driven): skill-architect compliance — frontmatter, dispatch, error handling

## 0.8.0

### Minor Changes

- feat: set up changeset-publish workflow for monorepo versioning and npm publishing
  fix(spec-driven): resolve arbiter findings — add MAP/INIT phases to meta, clarify scope thresholds
  fix(summon): fix postinstall crash blocking npx usage (v0.0.8)
  fix(spec-driven): skill-architect compliance — frontmatter, dispatch, error handling

## 0.7.0

### Minor Changes

- feat: set up changeset-publish workflow for monorepo versioning and npm publishing
  fix(spec-driven): resolve arbiter findings — add MAP/INIT phases to meta, clarify scope thresholds
  fix(summon): fix postinstall crash blocking npx usage (v0.0.8)
  fix(spec-driven): skill-architect compliance — frontmatter, dispatch, error handling

## 0.6.0

### Minor Changes

- feat: set up changeset-publish workflow for monorepo versioning and npm publishing
  fix(spec-driven): resolve arbiter findings — add MAP/INIT phases to meta, clarify scope thresholds
  fix(summon): fix postinstall crash blocking npx usage (v0.0.8)
  fix(spec-driven): skill-architect compliance — frontmatter, dispatch, error handling

## 0.5.0

### Minor Changes

- feat: set up changeset-publish workflow for monorepo versioning and npm publishing
  fix(spec-driven): resolve arbiter findings — add MAP/INIT phases to meta, clarify scope thresholds
  fix(summon): fix postinstall crash blocking npx usage (v0.0.8)
  fix(spec-driven): skill-architect compliance — frontmatter, dispatch, error handling

## 0.4.0

### Minor Changes

- feat: set up changeset-publish workflow for monorepo versioning and npm publishing
  fix(spec-driven): resolve arbiter findings — add MAP/INIT phases to meta, clarify scope thresholds
  fix(summon): fix postinstall crash blocking npx usage (v0.0.8)
  fix(spec-driven): skill-architect compliance — frontmatter, dispatch, error handling

## 0.3.0

### Minor Changes

- feat: set up changeset-publish workflow for monorepo versioning and npm publishing
  fix(spec-driven): resolve arbiter findings — add MAP/INIT phases to meta, clarify scope thresholds
  fix(summon): fix postinstall crash blocking npx usage (v0.0.8)
  fix(spec-driven): skill-architect compliance — frontmatter, dispatch, error handling

## 0.2.0

### Minor Changes

- feat: set up changeset-publish workflow for monorepo versioning and npm publishing
  fix(spec-driven): resolve arbiter findings — add MAP/INIT phases to meta, clarify scope thresholds
  fix(summon): fix postinstall crash blocking npx usage (v0.0.8)
  fix(spec-driven): skill-architect compliance — frontmatter, dispatch, error handling

## 0.1.0

### Minor Changes

- feat: set up changeset-publish workflow for monorepo versioning and npm publishing
  fix(spec-driven): resolve arbiter findings — add MAP/INIT phases to meta, clarify scope thresholds
  fix(summon): fix postinstall crash blocking npx usage (v0.0.8)
  fix(spec-driven): skill-architect compliance — frontmatter, dispatch, error handling

## 0.0.2

### Patch Changes

- Add project setup flow to spec-driven skill
