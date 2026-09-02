# @runecraft/grimoire

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
