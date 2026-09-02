# Project agent memory

This file is the project's committed base for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

## What this repo is

- Grimoire is the unified agent-skill catalog and installer, published as **`@runecraft/grimoire`** (see `packages/skills/package.json`).
- Content layout: one folder per skill under `packages/skills/skills/` (each with `SKILL.md` + optional `references/`, `scripts/`, `.skill-meta.json`); shared docs under `packages/skills/references/` (`definition-of-done.md`, `testing-patterns.md`).
- The single package combines the catalog and `grimoire` executable in `packages/skills/`; category metadata is in `packages/skills/catalog.json`.

## Identity rules (hard constraints)

- The npm package name must stay exactly `@runecraft/grimoire`; the only executable is `grimoire`.
- The seed `LICENSE` carries `Copyright (c) 2026 Arcanum` verbatim — leave it untouched unless a maintainer decides otherwise.

## Validation

- `npm pack --dry-run --workspace @runecraft/grimoire` — confirms the catalog, metadata, references, and installer are packaged.
- `bun run test` — unit tests for both packages (temp dirs only; never real user dirs).
- `bun run build` — bundles `packages/skills/dist/grimoire.js`.
- `bun run typecheck` — typechecks both packages.
- `python3 packages/skills/skills/skill-forge/scripts/validate.py packages/skills/skills/skill-forge` — SKILL.md structure validator (23 checks; 1 pre-existing warning, not a failure).
- New skills must ship `SKILL.md` + `references/` and follow the skill-forge conventions.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
