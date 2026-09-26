# Skills client docs and smoke-test checklist

- [x] Document stdio launch/configuration for Claude Code, Cursor, VS Code/GitHub Copilot, Claude Desktop, Codex CLI, and OpenCode.
- [x] Scope Pi as unsupported for this MCP release because an integration was not verified; note the separate CLI's Pi native install support.
- [x] Document the distinction between `npx @runecraft/grimoire-mcp` and `npx @runecraft/grimoire`, including no installs from MCP, no MCP configuration from CLI, host description-injection caveat, and using both together.
- [x] Document MCP disclosure boundaries and explicitly state what is not guaranteed.
- [x] Add a generic SDK stdio test that launches the built package, discovers tools, and performs a bounded `read_skill` roundtrip against a local fixture catalog.
- [x] Run `bun run --cwd packages/mcp build`.
- [x] Run `bun run --cwd packages/mcp test` (4 tests pass, including stdio roundtrip).
- [x] Run full monorepo tests, typecheck, and build (`bun run test`, `bun run typecheck`, `bun run build`).
- [ ] Commit changes and deliver via `/drill`; no merge or manual push.

Real client binaries are not exercised by the smoke test; their snippets are documented, not claimed as end-to-end host verification.
