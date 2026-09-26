# Skills MCP package checklist

- [x] Added `@runecraft/grimoire-mcp` as a Node-compatible ESM package using the official MCP TypeScript SDK.
- [x] Stdio transport is isolated behind `start(transport)`; no prompts or catalog resources are registered.
- [x] Added bounded `search_skills`, `read_skill`, `fetch_skill_files`, `prepare_skill_files`, and explicitly gated paginated `list_skills`.
- [x] Catalog validation/ranking/cache and hash-verified cache writing use `packages/core`.
- [x] Added MCP initialize/tool roundtrip coverage demonstrating descriptions appear on explicit search, not tool discovery; added response-budget and input/path checks.
- [x] Full monorepo tests, typecheck, and build pass; MCP package builds and `npm pack --dry-run` includes the executable bundle.
- [ ] Commit implementation and run `/drill`.
