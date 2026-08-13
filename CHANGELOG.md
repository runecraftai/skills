# @runecraft/skills

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
