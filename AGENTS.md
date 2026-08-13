# Project agent memory

This file is the project's committed base for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

## What this repo is

- `runecraftai/skills` — home of the Runecraft agent-skill catalog, published on npm as **`@runecraft/skills`** (see `package.json`). It is the renamed continuation of the legacy `@runecraft/spells` package (frozen in the arcanum monorepo); `CHANGELOG.md` documents the 0.15.0 → 0.16.0 rename.
- Content layout: one folder per skill under `skills/` (each with `SKILL.md` + optional `references/`, `scripts/`, `.skill-meta.json`); shared docs under `references/` (`definition-of-done.md`, `testing-patterns.md`).
- Slice 2 adds the installer TUI: `runecraft-skills` bin (interactive clack flow + `--skill/--target` scripting), built with Bun + TypeScript from `src/` into a single `dist/skills.js` (see `package.json` scripts). Install destinations: pi `~/.pi/agent/skills/`, Claude `~/.claude/skills/`, Codex `~/.codex/skills/`, OpenCode `~/.config/opencode/skills/` (env overrides `PI_HOME`/`CLAUDE_CONFIG_DIR`/`CODEX_HOME`/`XDG_CONFIG_HOME`; see `src/targets.ts`).

## Identity rules (hard constraints)

- The npm package name must stay exactly `@runecraft/skills`. Never reintroduce `@runecraft/spells` or arcanum references as live identity — the word "spells" is allowed only as natural language, never as package/repo identity. The only place the old name may appear is the `CHANGELOG.md` rename note (required to document 0.15.0 → 0.16.0).
- The seed `LICENSE` carries `Copyright (c) 2026 Arcanum` verbatim — leave it untouched unless a maintainer decides otherwise.

## Validation

- `npm pack --dry-run` — confirms `files: ["skills/", "references/", "dist/"]` packs the catalog + installer.
- `bun test` — unit + CLI tests for target resolution, catalog listing, and install-copy logic (temp dirs only; never real user dirs).
- `bun run build && node dist/skills.js --list` — bundles the TUI and smoke-checks it.
- `bunx tsc --noEmit` — typecheck (`src/` + `test/`).
- `python3 skills/skill-forge/scripts/validate.py skills/skill-forge` — SKILL.md structure validator (23 checks; 1 pre-existing warning, not a failure).
- New skills must ship `SKILL.md` + `references/` and follow the skill-forge conventions.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
