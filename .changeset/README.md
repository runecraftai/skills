# Changesets

Create a changeset for every user-facing change to a published package:

```bash
bun changeset
```

Select the affected published package (`@runecraft/grimoire` or `@runecraft/grimoire-mcp`), choose the semver bump, and commit the generated markdown file. Merging a changeset to `main` versions the package and creates a version tag. The tag workflow publishes the package to npm.
