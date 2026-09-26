import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const CLI = join(import.meta.dir, "..", "src", "index.ts");
const run = (args: string[]) => spawnSync("bun", ["run", CLI, ...args], { encoding: "utf8" });
describe("grimoire CLI", () => {
  test("lists categorized catalog entries", () => { const r = run(["list"]); expect(r.status).toBe(0); expect(r.stdout).toContain("[Planning & Specification]"); expect(r.stdout).toContain("spec-driven"); });
  test("detect prints recommendations", () => { const dir = mkdtempSync(join(tmpdir(), "grimoire-cli-")); try { writeFileSync(join(dir, "tsconfig.json"), "{}"); const r = spawnSync("bun", ["run", CLI, "detect"], { cwd: dir, encoding: "utf8" }); expect(r.status).toBe(0); expect(r.stdout).toContain("typescript-patterns"); } finally { rmSync(dir, { recursive: true, force: true }); } });
  test("noninteractive install copies selected skill", () => { const project = mkdtempSync(join(tmpdir(), "grimoire-project-")), target = join(project, "target"); try { const r = spawnSync("bun", ["run", CLI, "install", "-s", "spec-driven", "-t", "pi", "--target-dir", target], { cwd: project, encoding: "utf8" }); expect(r.status).toBe(0); expect(existsSync(join(target, "spec-driven", "SKILL.md"))).toBe(true); expect(existsSync(join(project, ".grimoire-lock.json"))).toBe(true); } finally { rmSync(project, { recursive: true, force: true }); } });
  test("help identifies the single executable without loading the renderer", () => { const r = spawnSync("bun", ["run", CLI, "--help"], { encoding: "utf8", env: { ...process.env, OPENTUI_LIBC: "invalid" } }); expect(r.status).toBe(0); expect(r.stdout).toContain("grimoire"); expect(r.stdout).toContain("--target-dir"); });
  test("no-arg and leading --global refuse non-TTY without writes", () => {
    const root = mkdtempSync(join(tmpdir(), "grimoire-nontty-")), project = root, home = join(root, "home");
    try {
      for (const args of [[], ["--global"]]) {
        const r = spawnSync("bun", ["run", CLI, ...args], { cwd: project, encoding: "utf8", env: { ...process.env, HOME: home, XDG_CONFIG_HOME: join(home, ".config"), BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0" } });
        expect(r.status).toBe(1); expect(r.stdout).toBe(""); expect(r.stderr.trim().split("\n")).toHaveLength(1); expect(r.stderr).toContain("stdin and stdout must both be TTYs");
        expect(existsSync(join(project, ".grimoire-lock.json"))).toBe(false); expect(existsSync(home)).toBe(false);
      }
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
