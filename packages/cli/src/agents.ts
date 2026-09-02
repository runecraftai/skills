import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

export type AgentId = "pi" | "claude-code" | "codex" | "opencode" | "cursor";
export interface Agent { id: AgentId; name: string; projectPath: string; globalPath: string; }
export const AGENTS: readonly Agent[] = [
  { id: "pi", name: "Pi", projectPath: ".pi/skills", globalPath: "~/.pi/agent/skills" },
  { id: "claude-code", name: "Claude Code", projectPath: ".claude/skills", globalPath: "~/.claude/skills" },
  { id: "codex", name: "Codex", projectPath: ".codex/skills", globalPath: "~/.codex/skills" },
  { id: "opencode", name: "OpenCode", projectPath: ".opencode/skills", globalPath: "~/.config/opencode/skills" },
  { id: "cursor", name: "Cursor", projectPath: ".cursor/skills", globalPath: "~/.cursor/skills" },
];
export function getAgent(id: string): Agent | undefined { return AGENTS.find((agent) => agent.id === id); }
export function agentPath(agent: Agent, projectDir: string, global: boolean): string {
  if (!global) return resolve(projectDir, agent.projectPath);
  return join(homedir(), agent.globalPath.slice(2));
}
export function safeSkillName(name: string): boolean {
  return name.length > 0 && name !== "." && name !== ".." && !isAbsolute(name) && !name.includes("/") && !name.includes("\\");
}
