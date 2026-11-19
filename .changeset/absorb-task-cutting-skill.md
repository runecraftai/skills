---
"@runecraft/grimoire": major
---

Absorb `task-cutting` into `spec-driven` and give the two shared rubrics one owner each.

**Breaking for catalog consumers:** the `task-cutting` skill id is removed. A project whose `.grimoire-lock.json` records `task-cutting` gets `unknown skill` from `grimoire install` and loses update and audit coverage until it installs `spec-driven` instead. That is why this release is a major bump.

- **`task-cutting` → `spec-driven`**: the surface walk, the nine-dimension sweep, the one-way-door table, the Cut → Ground → Write mechanism, the task-document format (now `spec-driven/references/document-format.md`) and the Cut-only path are all part of the Tasks phase. `spec-driven` also keeps its independent Verifier, discrimination sensor, `STATE.md` decisions and lessons layer.
- **Nine-dimension rubric (one owner)**: `spec-driven/references/document-format.md` § Canonical rubric is the only place the nine keys and their landing kinds are written; `specify.md`, `verified-implementation/SKILL.md` and `verified-implementation/references/checklist-format.md` point at it.
- **Interview protocol (one owner)**: `interview-me` keeps the protocol; `idea-discovery` defers to it instead of restating it.
- **One grain rule**: `task-cutting`'s "a slice is one observable outcome, never a layer" replaces `spec-driven`'s per-function/per-file rule and its XS–XL file-count sizing, which contradicted it.
- **Entrypoint stays readable**: the absorbed mechanism lives in `spec-driven/references/cut.md`, with summary and pointers in `SKILL.md`, so `spec-driven` stays under the MCP `read_skill` response ceiling; `@runecraft/grimoire-mcp` now covers that ceiling against the published catalog in its tests.

Removed skill folder: `task-cutting`. Updated `catalog.json`, the README table, and cross-references in `idea-discovery` and `verified-implementation`.
