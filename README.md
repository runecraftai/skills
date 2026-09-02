# Runecraft Skills

[![npm](https://img.shields.io/npm/v/@runecraft/skills?label=npm)](https://www.npmjs.com/package/@runecraft/skills)
[![license](https://img.shields.io/badge/license-MIT-22c55e)](LICENSE)

Runecraft Skills is a Bun + Turborepo monorepo containing reusable `SKILL.md` workflows for pi, Claude Code, Codex, and OpenCode.

## Quick start

```bash
npx @runecraft/skills install
# or
bunx @runecraft/skills install
```

Install selected skills non-interactively:

```bash
npx @runecraft/skills install --skill spec-driven --target pi
```

See the package documentation in [`packages/skills/README.md`](packages/skills/README.md) for installer options and the complete catalog.

## Repository structure

```text
packages/skills/
├── skills/       # One directory per skill, each containing SKILL.md
├── references/   # Shared, on-demand reference documents
├── src/          # runecraft-skills installer
└── package.json  # Published as @runecraft/skills
```

The root workspace contains the Turborepo configuration, shared TypeScript configuration, Changesets, and GitHub Actions.

## Adding a skill

1. Create `packages/skills/skills/<skill-name>/SKILL.md` with valid frontmatter.
2. Add optional `README.md`, `references/`, and `scripts/` files as needed.
3. Add the skill to the catalog table in [`packages/skills/README.md`](packages/skills/README.md).
4. Run the checks before opening a pull request:

```bash
bun install
bun run lint
bun run test
bun run build
```

For a user-facing change, create a Changeset with `bun changeset` and commit the generated file under `.changeset/`.

## CI/CD

Pull requests and pushes to `main` run lint, tests, and the build through Turborepo. Changesets on `main` version the package and create a `v*` tag. Tagged releases publish `packages/skills` to npm using the repository's `NPM_TOKEN` secret.

## License

MIT
