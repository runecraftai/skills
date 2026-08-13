import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const CLI = join(fileURLToPath(new URL("..", import.meta.url)), "src", "index.ts");
const CATALOG = join(fileURLToPath(new URL("..", import.meta.url)), "skills");

let dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  dirs = [];
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "skills-cli-"));
  dirs.push(dir);
  return dir;
}

function runCli(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync("bun", ["run", CLI, ...args], { encoding: "utf8" });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe("runecraft-skills CLI (scripting mode)", () => {
  test("--list prints the real catalog", () => {
    const { status, stdout } = runCli(["--list"]);
    expect(status).toBe(0);
    for (const name of ["spec-driven", "skill-forge", "test-driven-development"]) {
      expect(stdout).toContain(name);
    }
    expect(stdout).toContain(CATALOG);
  });

  test("--help prints usage", () => {
    const { status, stdout } = runCli(["--help"]);
    expect(status).toBe(0);
    expect(stdout).toContain("--target");
    expect(stdout).toContain("--skill");
  });

  test("--version prints a semver", () => {
    const { status, stdout } = runCli(["--version"]);
    expect(status).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("installs a skill into a temp target dir", () => {
    const target = join(tempDir(), "skills");
    const { status, stdout, stderr } = runCli(["--skill", "spec-driven", "--target", "pi", "--target-dir", target]);
    expect(stderr).toBe("");
    expect(status).toBe(0);
    expect(stdout).toContain("installed: spec-driven");
    expect(existsSync(join(target, "spec-driven", "SKILL.md"))).toBe(true);
  });

  test("skips an already-installed skill by default, then overwrites with --overwrite", () => {
    const target = join(tempDir(), "skills");
    runCli(["--skill", "skill-forge", "--target", "claude", "--target-dir", target]);

    const second = runCli(["--skill", "skill-forge", "--target", "claude", "--target-dir", target]);
    expect(second.status).toBe(0);
    expect(second.stdout).toContain("already installed, skipped: skill-forge");

    const third = runCli(["--skill", "skill-forge", "--target", "claude", "--target-dir", target, "--overwrite"]);
    expect(third.status).toBe(0);
    expect(third.stdout).toContain("overwritten: skill-forge");
  });

  test("installs multiple skills with repeated --skill flags", () => {
    const target = join(tempDir(), "skills");
    const { status } = runCli(["-s", "git-worktree", "-s", "memory-management", "-t", "codex", "--target-dir", target]);
    expect(status).toBe(0);
    expect(existsSync(join(target, "git-worktree", "SKILL.md"))).toBe(true);
    expect(existsSync(join(target, "memory-management", "SKILL.md"))).toBe(true);
  });

  test("rejects inline values on boolean flags instead of silently honoring them", () => {
    for (const flag of ["--overwrite", "--list", "--help", "--version"]) {
      const { status, stderr } = runCli([`${flag}=false`]);
      expect(status).toBe(1);
      expect(stderr).toContain(`unexpected value for ${flag}`);
    }
  });

  test("--overwrite=false errors out and never replaces an installed skill", () => {
    const target = join(tempDir(), "skills");
    runCli(["--skill", "git-worktree", "--target", "pi", "--target-dir", target]);
    const marker = join(target, "git-worktree", "SKILL.md");
    writeFileSync(marker, "user-local edit");
    const { status, stderr } = runCli(["--skill", "git-worktree", "--target", "pi", "--target-dir", target, "--overwrite=false"]);
    expect(status).toBe(1);
    expect(stderr).toContain("unexpected value for --overwrite");
    expect(readFileSync(marker, "utf8")).toBe("user-local edit");
  });

  test("rejects an unknown skill name", () => {
    const { status, stderr } = runCli(["--skill", "nope-not-real", "--target", "pi", "--target-dir", tempDir()]);
    expect(status).toBe(1);
    expect(stderr).toContain("unknown skill");
  });

  test("rejects an unknown target", () => {
    const { status, stderr } = runCli(["--skill", "spec-driven", "--target", "vim"]);
    expect(status).toBe(1);
    expect(stderr).toContain("unknown target");
  });

  test("requires --target in scripting mode", () => {
    const { status, stderr } = runCli(["--skill", "spec-driven"]);
    expect(status).toBe(1);
    expect(stderr).toContain("--target");
  });

  test("does not touch real user directories", () => {
    // --list and --help never resolve or write to any target dir.
    const before = readFileSync(join(CATALOG, "spec-driven", "SKILL.md"), "utf8");
    runCli(["--list"]);
    runCli(["--help"]);
    expect(readFileSync(join(CATALOG, "spec-driven", "SKILL.md"), "utf8")).toBe(before);
  });
});
