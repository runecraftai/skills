import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const CLI = join(import.meta.dir, "..", "src", "index.ts");
const run = (args: string[]) => spawnSync("bun", ["run", CLI, ...args], { encoding: "utf8" });
describe("grimoire CLI", () => {
  test("lists categorized catalog entries", () => { const r = run(["list"]); expect(r.status).toBe(0); expect(r.stdout).toContain("[Planning & Specification]"); expect(r.stdout).toContain("spec-driven"); });
  test("detect prints recommendations", () => { const dir = mkdtempSync(join(tmpdir(), "grimoire-cli-")); try { writeFileSync(join(dir, "tsconfig.json"), "{}"); const r = spawnSync("bun", ["run", CLI, "detect"], { cwd: dir, encoding: "utf8" }); expect(r.status).toBe(0); expect(r.stdout).toContain("typescript-patterns"); } finally { rmSync(dir, { recursive: true, force: true }); } });
  test("noninteractive install copies selected skill", () => { const target = mkdtempSync(join(tmpdir(), "grimoire-target-")); try { const r = run(["install", "-s", "spec-driven", "-t", "pi", "--target-dir", target]); expect(r.status).toBe(0); expect(existsSync(join(target, "spec-driven", "SKILL.md"))).toBe(true); } finally { rmSync(target, { recursive: true, force: true }); } });
  test("help identifies the single executable", () => { const r = run(["--help"]); expect(r.stdout).toContain("grimoire"); expect(r.stdout).toContain("--target-dir"); });
});
