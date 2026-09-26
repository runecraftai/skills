# Grimoire

This package publishes the `@runecraft/grimoire` local skill catalog and the `grimoire` executable. Running `grimoire` with no arguments opens the full-screen OpenTUI catalog; there is no separate browse command.

The interactive TUI requires stdin and stdout to be TTYs. It supports Node >=26.4.0 (the launcher re-executes Node with `--experimental-ffi`) or Bun >=1.3.0. Run with `npx @runecraft/grimoire` on Node, or `bunx @runecraft/grimoire` on Bun. Scriptable commands such as `list`, `search`, `detect`, `status`, and `install -s <skill> -t <agent>` do not load the renderer.

See the repository [README](../../README.md) for commands, targets, and MCP client documentation.
