# Changesets

Create a changeset for every user-facing catalog or installer change:

```bash
bun changeset
```

Select `@runecraft/skills`, choose the semver bump, and commit the generated markdown file. Merging a changeset to `main` versions the package and creates a version tag. The tag workflow publishes the package to npm.
