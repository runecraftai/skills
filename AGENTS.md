# Project agent memory

This file is the project's committed base for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

## What this repo is

- `runecraftai/skills` — home of the Runecraft agent-skill catalog, published on npm as **`@runecraft/skills`** (see `packages/skills/package.json`). It is the renamed continuation of the legacy `@runecraft/spells` package (frozen in the arcanum monorepo); `CHANGELOG.md` documents the 0.15.0 → 0.16.0 rename.
- Content layout: one folder per skill under `packages/skills/skills/` (each with `SKILL.md` + optional `references/`, `scripts/`, `.skill-meta.json`); shared docs under `packages/skills/references/` (`definition-of-done.md`, `testing-patterns.md`).
- The repository contains two packages: `@runecraft/skills`, whose `runecraft-skills` TUI is built from `packages/skills/src/`, and `@runecraft/cli`, whose `grimoire` CLI is built from `packages/cli/src/` and bundles the catalog for project/global installs. See each package's `package.json` scripts and the root README for user-facing usage.

## Identity rules (hard constraints)

- The npm package name must stay exactly `@runecraft/skills`. Never reintroduce `@runecraft/spells` or arcanum references as live identity — the word "spells" is allowed only as natural language, never as package/repo identity. The only place the old name may appear is the `CHANGELOG.md` rename note (required to document 0.15.0 → 0.16.0).
- The seed `LICENSE` carries `Copyright (c) 2026 Arcanum` verbatim — leave it untouched unless a maintainer decides otherwise.

## Validation

- `npm pack --dry-run --workspace @runecraft/skills` — confirms `files: ["skills/", "references/", "dist/"]` packs the catalog + installer.
- `bun run test` — unit tests for both packages (temp dirs only; never real user dirs).
- `bun run build` — bundles both package artifacts, including `packages/cli/dist/cli.js` and its catalog.
- `bun run typecheck` — typechecks both packages.
- `python3 packages/skills/skills/skill-forge/scripts/validate.py packages/skills/skills/skill-forge` — SKILL.md structure validator (23 checks; 1 pre-existing warning, not a failure).
- New skills must ship `SKILL.md` + `references/` and follow the skill-forge conventions.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
