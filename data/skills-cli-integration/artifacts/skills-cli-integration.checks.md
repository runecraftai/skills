# Skills CLI integration checks

- [x] Preserve `@runecraft/grimoire` package and `grimoire` binary.
- [x] Consume shared core registry validation, fetching, digest verification and ranking.
- [x] Read v1 locks and write v2 lock metadata additively, retaining `hash`.
- [x] Add remote-backed search, install, available/installed list, remove and audit paths.
- [x] Add offline cached-revision mode with explicit unknown-freshness warning.
- [x] Document CLI/MCP coexistence and opt-in installation behavior.
- [ ] Implement lock-tracked update semantics and breaking-hash confirmation (currently fails closed without changing installs).
- [ ] Audit unmanaged directories and make `--fix` explicitly interactive.
- [ ] Validate remote commands, lock migration and tamper detection with isolated CLI fixtures.
- [x] `bun run --cwd packages/skills test` (45 tests), `typecheck`, and `build`.
