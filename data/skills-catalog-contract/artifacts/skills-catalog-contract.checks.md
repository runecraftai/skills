# Skills catalog contract v1 checklist

- [x] Strict v1 schema and generated registry fields.
- [x] Deterministic generation from the 32 source skills, with SHA-256 per file and directory digest.
- [x] Copy only regular files; reject symlinks and invalid/escaping paths; exclude VCS/editor/cache artifacts.
- [x] Validate ids, taxonomy membership, required entrypoint, frontmatter, SPDX license allowlist, attribution, exact schema, and file/directory hashes.
- [x] Document descriptions as untrusted display text and publish the canonical digest algorithm/test vector.
- [x] Generate/validate the existing `catalog.json` taxonomy against registry ids and categories.
- [x] Cover duplicate ids, collisions, malformed schema/frontmatter, unsupported licenses, missing entrypoint, duplicate taxonomy membership, paths, file/directory digest mismatch, and the pinned vector in tests.
- [x] Commander decision applied: skills without source provenance are attributed as Runecraft-authored, with the catalog revision recorded.
- [x] Generator produces a valid registry for all 32 `SKILL.md` files; all generated content hashes verify.
- [x] Bun tests, typecheck/build, and npm pack dry-run pass.
- [ ] Commit implementation and run the drill delivery pipeline; verify PR and green CI.
