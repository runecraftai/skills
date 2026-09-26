# Generated catalog contract v1

Run `bun run --cwd packages/skills catalog:generate` to build `v1/registry.json` and the allowlisted skill files under `v1/skills/`. The registry is generated from `skills/` and `catalog.json`; taxonomy is rewritten from the validated registry so the legacy CLI taxonomy cannot silently diverge. Generated `catalogVersion` comes from `packages/skills/package.json`; `revision` and `generatedAt` are deterministic for the git revision. `CATALOG_REVISION` and `CATALOG_GENERATED_AT` can pin these values for reproducible release builds.

Each file record is an allowlist entry. Paths use UTF-8 relative forward-slash spelling; absolute paths, `..`, backslashes, control characters, symlinks, and non-regular files are rejected. VCS, editor, and cache files are excluded. The directory digest is SHA-256 over each file in bytewise-sorted UTF-8 path order, hashing `path bytes || NUL || raw file bytes` for each file in turn.

Pinned digest test vector: files `{ "b.txt": UTF-8("B"), "a.txt": UTF-8("A") }` produce `831d4624c74d035968429722f3e6c4a2a83aa0f868cfe7fd8743182f0d3bfc16`.

Descriptions in the registry are untrusted display text. They must not be interpreted as executable instructions or commands. The contract validates structure and integrity, not the safety or truth of skill prose.
