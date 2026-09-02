# Grimoire

Grimoire is a catalog of reusable `SKILL.md` workflows for coding agents, with one safe interactive installer. Browse skills by category or let Grimoire inspect the current project and recommend a starting set.

## Quick start

```bash
npx @runecraft/grimoire
# or
bunx @runecraft/grimoire
```

Both commands launch the same flow: choose a category or **Detect project skills**, review the multi-selection, choose a destination agent, and explicitly confirm installation. Nothing is installed before confirmation.

## Supported agents

Grimoire currently supports pi, Claude Code, Codex CLI, and OpenCode. Destinations follow each agent's conventional skills directory and honor their supported environment overrides.

## Commands

```bash
grimoire list                         # list every catalog entry
grimoire search typescript             # search names, descriptions, and categories
grimoire detect                        # print project recommendations
grimoire install -s spec-driven -t pi  # noninteractive installation
grimoire install -s skill-forge -t codex --overwrite
```

The executable is `grimoire`; use `grimoire --help` for all options. `--target-dir` supports automation and isolated test destinations. Noninteractive commands require explicit skill and agent selections.

## Categories

The catalog is organized into Build & Design, Testing & Quality, Security & Operations, Agent Craft, and Planning & Collaboration. Every bundled skill appears in a category and remains available through search.

## Safety

Installation copies catalog skill directories into the selected agent destination. Existing skills are skipped by default; `--overwrite` or the interactive conflict choice replaces them. Project installations can be tracked in `.grimoire-lock.json`. Path isolation, catalog symlink checks, and skill-name validation protect destinations from traversal and symlink surprises.

## Development

```bash
bun install
bun run lint
bun run test
bun run typecheck
bun run build
npm pack --dry-run --workspace @runecraft/grimoire
```

The catalog lives in `packages/skills/skills/`; category metadata is in `packages/skills/catalog.json`. Add a skill folder with `SKILL.md`, then add its name to a category. Run the skill validator when changing skill structure:

```bash
python3 packages/skills/skills/skill-forge/scripts/validate.py packages/skills/skills/skill-forge
```

## License

MIT. See [LICENSE](LICENSE).
