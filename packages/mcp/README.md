# Runecraft MCP server

`@runecraft/grimoire-mcp` provides on-demand access to the Runecraft skill catalog over MCP stdio. It requires Node.js 20.12 or newer and does not install skills into agent directories. Tool discovery advertises tool schemas; catalog descriptions are returned only after an explicit tool call. Search returns a bounded set of matches, and `read_skill` returns only the requested skill.

This is not a security guarantee about skill content: a skill body can influence the session after you explicitly read it. The server does not register MCP prompts or a `skills://catalog` resource.

## Configure a client

These snippets configure each host to launch the stdio server using `npx`. The generic stdio roundtrip test in this repository exercises launch, tool discovery, and a bounded `read_skill` call through the MCP SDK. It does not launch or certify any of these host applications; use the host's own documentation for additional configuration options.

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

Pi is not listed as a supported MCP host here. This release has not verified a native MCP integration or adapter for Pi, so do not configure or rely on this server through Pi. The separate Grimoire CLI supports native Pi skill installation.

## MCP and CLI are separate, and can be used together

- `npx @runecraft/grimoire-mcp` launches the on-demand MCP server. It does not install skills, write skill files to agent directories, or configure the CLI. Server cache files may be written only when the explicit `prepare_skill_files` tool is called; this is not a native skill installation.
- `npx @runecraft/grimoire` runs the Grimoire CLI. Its explicit install workflow copies chosen skill files into an agent's skill directory for native discovery and offline use. A host may then inject installed skill descriptions into its context; that host behavior is outside Grimoire's guarantee. The CLI does not configure an MCP server.
- You can use both: MCP for just-in-time discovery and reading, CLI for a deliberately selected set of persistent/offline skills.

The MCP path avoids automatic catalog-wide description injection by this server: skill descriptions are not sent at initialization, and search/read content is disclosed only in response to tool calls. It cannot prevent a client from surfacing tool results, nor prevent explicitly requested skill content from influencing a session. The CLI's installed skills remain subject to each host's native loading behavior.

## Verification

`bun run --cwd packages/mcp test` includes a generic MCP SDK client that starts the built server over stdio, discovers its tools, and reads one bounded fixture skill through a local test catalog. It does not verify launching with real Claude Code, Cursor, VS Code/Copilot, Claude Desktop, Codex, or OpenCode binaries.
