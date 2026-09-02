import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectStack } from "../src/detect.js";
import { installSkill, skillHash } from "../src/install.js";
import { readLockfile, updateLock, writeLockfile } from "../src/lockfile.js";
import { readRegistry } from "../src/registry.js";

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs) rmSync(dir, { recursive: true, force: true }); dirs.length = 0; });
function temp(): string { const dir = mkdtempSync(join(tmpdir(), "grimoire-")); dirs.push(dir); return dir; }

describe("registry", () => {
  test("lists catalog skills and parses folded descriptions", () => {
    const root = temp(); const skill = join(root, "alpha"); mkdirSync(skill, { recursive: true });
    writeFileSync(join(skill, "SKILL.md"), "---\nname: alpha\ndescription: >\n  A useful skill.\n---\n");
    expect(readRegistry(root)).toEqual([{ name: "alpha", description: "A useful skill.", version: "0.1.0", dir: skill }]);
  });
});

describe("installation and lockfile", () => {
  test("hash is stable and records an installed skill", () => {
    const root = temp(); const source = join(root, "alpha"); mkdirSync(source, { recursive: true }); writeFileSync(join(source, "SKILL.md"), "alpha\n");
    const target = join(root, "target"); const skill = { name: "alpha", description: "", version: "1.0.0", dir: source };
    expect(installSkill(skill, target)).toBe("installed");
    expect(readFileSync(join(target, "alpha", "SKILL.md"), "utf8")).toBe("alpha\n");
    const lock = readLockfile(root); updateLock(lock, "alpha", { version: "1.0.0", hash: skillHash(source), installed: "now", agents: ["pi"] }); writeLockfile(root, lock);
    expect(JSON.parse(readFileSync(join(root, ".grimoire-lock.json"), "utf8")).skills.alpha.hash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
  test("rejects path traversal", () => {
    const root = temp(); const source = join(root, "alpha"); mkdirSync(source); writeFileSync(join(source, "SKILL.md"), "x");
    expect(() => installSkill({ name: "../escape", description: "", version: "1", dir: source }, join(root, "target"))).toThrow("unsafe skill name");
  });
  test("rejects symlinked target directories", () => {
    const root = temp(); const outside = temp(); const source = join(root, "alpha"); mkdirSync(source); writeFileSync(join(source, "SKILL.md"), "x");
    const target = join(root, "target"); symlinkSync(outside, target);
    expect(() => installSkill({ name: "alpha", description: "", version: "1", dir: source }, target)).toThrow("target path cannot contain symlinks");
    expect(readFileSync(join(source, "SKILL.md"), "utf8")).toBe("x");
  });
});

test("detectStack finds TypeScript from package.json and config", () => {
  const root = temp(); writeFileSync(join(root, "package.json"), JSON.stringify({ devDependencies: { typescript: "^5" } }));
  expect(detectStack(root)).toEqual({ stack: ["typescript"], skills: ["typescript-patterns"] });
});
