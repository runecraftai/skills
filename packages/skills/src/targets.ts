/**
 * Install targets: which agent, and where that agent's skills directory lives.
 *
 * Path conventions, verified against each target's own docs and installed CLI:
 *
 *  - pi        ~/.pi/agent/skills           pi home: $PI_HOME (default ~/.pi)
 *  - claude    ~/.claude/skills             Claude Code config dir: $CLAUDE_CONFIG_DIR (default ~/.claude)
 *  - codex     ~/.codex/skills              Codex config dir: $CODEX_HOME (default ~/.codex). This is the
 *                                           legacy location, but it is still the install target used by
 *                                           OpenAI's official skill-installer and is scanned by Codex CLI;
 *                                           the newer cross-agent ~/.agents/skills convention is also read
 *                                           by Codex CLI and OpenCode (see README).
 *  - opencode  ~/.config/opencode/skills    XDG config home: $XDG_CONFIG_HOME (default ~/.config)
 */
import { homedir } from "node:os";
import { join } from "node:path";

export type TargetId = "pi" | "claude" | "codex" | "opencode";

export interface InstallTarget {
  id: TargetId;
  label: string;
  description: string;
}

export const TARGETS: readonly InstallTarget[] = [
  { id: "pi", label: "pi", description: "pi coding agent — ~/.pi/agent/skills" },
  { id: "claude", label: "Claude Code", description: "~/.claude/skills" },
  { id: "codex", label: "Codex CLI", description: "~/.codex/skills" },
  { id: "opencode", label: "OpenCode", description: "~/.config/opencode/skills" },
];

export function isTargetId(value: string): value is TargetId {
  return TARGETS.some((t) => t.id === value);
}

/** Overridable path inputs so resolution is pure and testable without touching real user dirs. */
export interface PathContext {
  home?: string;
  env?: Record<string, string | undefined>;
  projectDir?: string;
  global?: boolean;
}

/** Resolve the skills directory for an agent, honoring the agent's own env conventions. */
export function resolveSkillsDir(id: TargetId, ctx: PathContext = {}): string {
  const home = ctx.home ?? homedir();
  const env = ctx.env ?? process.env;
  if (ctx.global === false) {
    const projectPaths: Record<TargetId, string> = { pi: ".pi/agent/skills", claude: ".claude/skills", codex: ".codex/skills", opencode: ".opencode/skills" };
    return join(ctx.projectDir ?? process.cwd(), projectPaths[id]);
  }
  switch (id) {
    case "pi":
      return join(env.PI_HOME ?? join(home, ".pi"), "agent", "skills");
    case "claude":
      return join(env.CLAUDE_CONFIG_DIR ?? join(home, ".claude"), "skills");
    case "codex":
      return join(env.CODEX_HOME ?? join(home, ".codex"), "skills");
    case "opencode": {
      const xdg = env.XDG_CONFIG_HOME ?? join(home, ".config");
      return join(xdg, "opencode", "skills");
    }
  }
}

/** Shorten a path for display: /home/u/.pi/agent/skills -> ~/.pi/agent/skills */
export function displayPath(path: string, home: string = homedir()): string {
  const root = home.replace(/\/+$/, "");
  if (path === root) return "~";
  if (path.startsWith(root + "/")) return "~" + path.slice(root.length);
  return path;
}
