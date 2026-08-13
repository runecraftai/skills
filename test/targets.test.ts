import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { displayPath, isTargetId, resolveSkillsDir, TARGETS } from "../src/targets.js";

let dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  dirs = [];
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "skills-targets-"));
  dirs.push(dir);
  return dir;
}

describe("resolveSkillsDir", () => {
  test("resolves default destinations under the home dir", () => {
    const home = "/home/tester";
    const env: Record<string, string> = {}; // isolate from the real process.env
    expect(resolveSkillsDir("pi", { home, env })).toBe("/home/tester/.pi/agent/skills");
    expect(resolveSkillsDir("claude", { home, env })).toBe("/home/tester/.claude/skills");
    expect(resolveSkillsDir("codex", { home, env })).toBe("/home/tester/.codex/skills");
    expect(resolveSkillsDir("opencode", { home, env })).toBe("/home/tester/.config/opencode/skills");
  });

  test("honors each agent's config-dir env convention", () => {
    const home = "/home/tester";
    const env: Record<string, string> = {
      PI_HOME: "/alt/pi",
      CLAUDE_CONFIG_DIR: "/alt/claude",
      CODEX_HOME: "/alt/codex",
      XDG_CONFIG_HOME: "/alt/xdg",
    };
    expect(resolveSkillsDir("pi", { home, env })).toBe("/alt/pi/agent/skills");
    expect(resolveSkillsDir("claude", { home, env })).toBe("/alt/claude/skills");
    expect(resolveSkillsDir("codex", { home, env })).toBe("/alt/codex/skills");
    expect(resolveSkillsDir("opencode", { home, env })).toBe("/alt/xdg/opencode/skills");
  });

  test("env overrides apply per target without leaking to others", () => {
    const home = "/home/tester";
    expect(resolveSkillsDir("codex", { home, env: { CODEX_HOME: "/x" } })).toBe("/x/skills");
    expect(resolveSkillsDir("opencode", { home, env: { CODEX_HOME: "/x" } })).toBe("/home/tester/.config/opencode/skills");
  });

  test("does not touch the real filesystem", () => {
    // Resolution is pure path math: the target dir need not exist.
    const home = tempDir();
    const resolved = resolveSkillsDir("pi", { home, env: {} });
    expect(resolved).toBe(join(home, ".pi", "agent", "skills"));
  });
});

describe("TARGETS", () => {
  test("exposes exactly the four supported agents", () => {
    expect(TARGETS.map((t) => t.id).sort()).toEqual(["claude", "codex", "opencode", "pi"]);
  });

  test("isTargetId accepts valid ids and rejects others", () => {
    for (const id of TARGETS.map((t) => t.id)) expect(isTargetId(id)).toBe(true);
    for (const bad of ["vim", "cursor", "Pi", ""]) expect(isTargetId(bad)).toBe(false);
  });
});

describe("displayPath", () => {
  test("shortens home-relative paths with a tilde", () => {
    expect(displayPath("/home/u/.pi/agent/skills", "/home/u")).toBe("~/.pi/agent/skills");
    expect(displayPath("/home/u", "/home/u")).toBe("~");
  });

  test("leaves foreign paths untouched", () => {
    expect(displayPath("/opt/custom/skills", "/home/u")).toBe("/opt/custom/skills");
  });
});
