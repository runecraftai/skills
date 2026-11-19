# Project agent memory

This file is the project's committed base for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

## What this repo is

- Grimoire is the unified agent-skill catalog and installer, published as **`@runecraft/grimoire`** (see `packages/skills/package.json`).
- Content layout: one folder per skill under `packages/skills/skills/` (each with `SKILL.md` + optional `references/`, `assets/`, `scripts/`, `.skill-meta.json`); shared docs under `packages/skills/references/` (`definition-of-done.md`, `testing-patterns.md`).
- `packages/skills/` publishes the catalog and `grimoire` executable; `packages/core/` is the private shared client core; `packages/mcp/` publishes `@runecraft/grimoire-mcp`, a stdio-first MCP server. `catalog.json` is a generated taxonomy (rebuilt by `catalog:generate` from the validated registry). Catalog contract: [`packages/skills/catalog/README.md`](packages/skills/catalog/README.md).

## Identity rules (hard constraints)

- The `@runecraft/grimoire` package name and `grimoire` executable are fixed; `@runecraft/grimoire-mcp` is the separate MCP server package with its own `grimoire-mcp` executable.
- The seed `LICENSE` carries `Copyright (c) 2026 Arcanum` verbatim — leave it untouched unless a maintainer decides otherwise.

## Search ranking contract

- `rankSkills` (`packages/core/src/index.ts`) is a stopword-aware, whole-word lexical scorer, not BM25 or an LLM. `search_skills` (`packages/mcp/src/index.ts`) degrades gracefully instead of throwing when matches exceed its 1200-byte ceiling: it drops lowest-ranked matches and returns `{ skills, truncated }`. Changes to either must keep both the ranking regression tests in `packages/core/test/core.test.ts` and the ceiling tests in `packages/mcp/test/mcp.test.ts` green.

## Validation

- `npm pack --dry-run --workspace @runecraft/grimoire` — confirms the catalog, metadata, references, and installer are packaged.
- `bun run test` — unit tests for all packages (temp dirs only; never real user dirs).
- `bun run build` — bundles `packages/skills/dist/grimoire.js` and `packages/mcp/dist/index.js`.
- `bun run typecheck` — typechecks all packages. TypeScript skill scripts are covered only when their path is listed in the `packages/skills/tsconfig.json` `include` array (for example `skills/feature-parity/scripts/feature-parity.ts`); adding a `.ts` script under `skills/` does not typecheck it by itself.
- `bun run --cwd packages/skills catalog:generate` — rebuilds `catalog/v1/registry.json`, copies allowlisted skill files, and regenerates `catalog.json` from the validated registry.
- `python3 -B packages/skills/scripts/validate-skills.py` — runs the skill-forge mechanism validator over every catalog skill and ratchets findings against `packages/skills/skills/skill-forge/references/validation-baseline.json`; only listed legacy errors are accepted, and new or stale baseline entries fail. CI and the catalog release security job both use this command; never add a strict per-skill `validate.py` loop to a workflow. Single skill: `python3 packages/skills/skills/skill-forge/scripts/validate.py <skill-dir>` (`--self-test` runs the good/bad fixture suite).
- New skills must follow the skill-forge conventions (`packages/skills/skills/skill-forge/SKILL.md` §2.2 folder layout): `SKILL.md` plus `references/`, `assets/`, or `scripts/` only when the skill's content justifies them.

## Single owners for shared rubrics

- **Nine unwritten-requirement dimensions** and the `.tasks/<name>.md` document format: `packages/skills/skills/spec-driven/references/document-format.md` § Canonical rubric. `specify.md`, `verified-implementation/SKILL.md` and `verified-implementation/references/checklist-format.md` point here; never restate the keys or the landing kinds.
- **Five surface kinds and the decisions each carries**: `packages/skills/skills/spec-driven/references/cut.md` § Walk the surfaces. `spec-driven/references/discuss.md` points here.
- **Interview protocol** (one question at a time, each with the agent's recommended answer): `interview-me`. `idea-discovery` defers to it.
- **Task grain**: slice by observable outcome, never by layer, one task per source by default (`spec-driven/SKILL.md` § Tasks — the cut). Do not reintroduce per-function or per-file task sizing; it contradicts that rule.
- Pointers across skills name the skill and the file, never a relative path — the skill validator rejects a `references/...` word in another skill's `SKILL.md` as a forward link.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
