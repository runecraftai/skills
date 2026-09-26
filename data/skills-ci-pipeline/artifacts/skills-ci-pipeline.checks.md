# Skills CI pipeline checks

- [x] Run on pull requests and pushes to `main` with read-only repository permissions.
- [x] Pin GitHub Actions to immutable commit SHAs and Bun to the version in `package.json`.
- [x] Install from the frozen Bun lockfile; build, typecheck, test, and lint all workspaces through Turborepo.
- [x] Regenerate catalog artifacts using the committed registry metadata and fail on tracked or untracked artifact changes.
- [x] Verify build, typecheck, tests, and lint locally (`bun run build`, `typecheck`, `test`, and `lint`).
- [x] Verify catalog regeneration leaves all tracked catalog artifacts unchanged when seeded with the committed registry metadata.
- [x] The workflow fails on deliberate tracked artifact drift (`git diff --exit-code`) and untracked generated artifacts (the scoped `git status` check).
