# Runecraft MCP server

`@runecraft/grimoire-mcp` provides on-demand access to the Runecraft skill catalog over MCP stdio. It requires Node.js 20.12 or newer and does not install skills into agent directories. Tool discovery advertises tool schemas; catalog descriptions are returned only after an explicit tool call. Search returns a bounded set of matches, and `read_skill` returns only the requested skill.

This is not a security guarantee about skill content: a skill body can influence the session after you explicitly read it. The server does not register MCP prompts or a `skills://catalog` resource.

## Configure a client

These snippets configure each host to launch the stdio server using `npx`. The generic stdio roundtrip test exercises the MCP protocol through the SDK, launching the built server both directly and through an npm-style `grimoire-mcp` bin symlink; native host validation is recorded separately below. Use each host's documentation for additional configuration options.

### Claude Code

```sh
claude mcp add --transport stdio runecraft -- npx -y @runecraft/grimoire-mcp
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "runecraft": {
      "command": "npx",
      "args": ["-y", "@runecraft/grimoire-mcp"]
    }
  }
}
```

### VS Code / GitHub Copilot

Add to `.vscode/mcp.json` (VS Code's `servers` schema):

```json
{
  "servers": {
    "runecraft": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@runecraft/grimoire-mcp"]
    }
  }
}
```

### Claude Desktop

Add to the Claude Desktop MCP configuration file:

```json
{
  "mcpServers": {
    "runecraft": {
      "command": "npx",
      "args": ["-y", "@runecraft/grimoire-mcp"]
    }
  }
}
```

### Codex CLI

Register the server using the Codex CLI:

```sh
codex mcp add runecraft -- npx -y @runecraft/grimoire-mcp
```

Equivalent `~/.codex/config.toml` entry:

```toml
[mcp_servers.runecraft]
command = "npx"
args = ["-y", "@runecraft/grimoire-mcp"]
```

### OpenCode

Add to `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "runecraft": {
      "type": "local",
      "command": ["npx", "-y", "@runecraft/grimoire-mcp"],
      "enabled": true
    }
  }
}
```

### Pi

Pi 0.99.0 has native MCP stdio support; no adapter or extension is required. Add this server to `~/.pi/agent/mcp.json`:

```json
{
  "mcpServers": {
    "runecraft": {
      "command": "npx",
      "args": ["-y", "@runecraft/grimoire-mcp"],
      "exposure": "codemode"
    }
  }
}
```

Pi's default MCP exposure is `codemode`. Start a session normally and call the MCP tools through `codemode`; do not pass `--tools` unless you include the required tools, because that flag replaces Pi's default tool selection. Run `pi mcp list` to check connection and discovery. No catalog-wide skill descriptions are inserted at startup; search and read content arrive only after explicit tool calls. The explicitly read skill content can influence the session. The separate Grimoire CLI installs selected skills natively and is a distinct workflow.

## MCP and CLI are separate, and can be used together

- `npx @runecraft/grimoire-mcp` launches the on-demand MCP server. It does not install skills, write skill files to agent directories, or configure the CLI. Server cache files may be written only when the explicit `prepare_skill_files` tool is called; this is not a native skill installation.
- `npx @runecraft/grimoire` runs the Grimoire CLI. Its explicit install workflow copies chosen skill files into an agent's skill directory for native discovery and offline use. A host may then inject installed skill descriptions into its context; that host behavior is outside Grimoire's guarantee. The CLI does not configure an MCP server.
- You can use both: MCP for just-in-time discovery and reading, CLI for a deliberately selected set of persistent/offline skills.

The MCP path avoids automatic catalog-wide description injection by this server: skill descriptions are not sent at initialization, and search/read content is disclosed only in response to tool calls. It cannot prevent a client from surfacing tool results, nor prevent explicitly requested skill content from influencing a session. The CLI's installed skills remain subject to each host's native loading behavior.

## Verification

`bun run --cwd packages/mcp test` launches the built server over stdio two ways — directly and through an npm-style `grimoire-mcp` bin symlink — discovers all five tools, and reads one bounded fixture skill through a local test catalog. It does not certify other host applications. Pi 0.99.0 was separately exercised as a real host with the extracted package tarball: native stdio launch and discovery of all five tools, followed by bounded `search_skills` and explicit `read_skill` calls against the production catalog. The host transcript and commands are recorded in the task validation artifacts; that local tarball check does not establish public npm availability.
