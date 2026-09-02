import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { findConflicts, installSkills } from "../src/install.js";

let dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  dirs = [];
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "skills-install-"));
  dirs.push(dir);
  return dir;
}

/** Build a catalog dir with one skill per name in [names]. */
function makeCatalog(root: string, names: string[]): string {
  const catalog = join(root, "catalog");
  for (const name of names) {
    const dir = join(catalog, name);
    mkdirSync(join(dir, "references"), { recursive: true });
    writeFileSync(join(dir, "SKILL.md"), `# ${name}\n`);
    writeFileSync(join(dir, "references", "guide.md"), `guide for ${name}\n`);
  }
  return catalog;
}

function tree(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out[full] = readFileSync(full, "utf8");
    }
  };
  walk(root);
  return out;
}

describe("installSkills", () => {
  test("copies skill folders (including references/) into the target dir", () => {
    const root = tempDir();
    const catalog = makeCatalog(root, ["alpha", "beta"]);
    const target = join(root, "target");

    const result = installSkills({ catalogDir: catalog, targetDir: target, names: ["alpha", "beta"] });

    expect(result.installed.sort()).toEqual(["alpha", "beta"]);
    expect(result.skipped).toEqual([]);
    expect(result.failed).toEqual([]);
    expect(tree(target)).toEqual({
      [join(target, "alpha", "SKILL.md")]: "# alpha\n",
      [join(target, "alpha", "references", "guide.md")]: "guide for alpha\n",
      [join(target, "beta", "SKILL.md")]: "# beta\n",
      [join(target, "beta", "references", "guide.md")]: "guide for beta\n",
    });
  });

  test("skips already-installed skills by default", () => {
    const root = tempDir();
    const catalog = makeCatalog(root, ["alpha"]);
    const target = join(root, "target");
    mkdirSync(join(target, "alpha"), { recursive: true });
    writeFileSync(join(target, "alpha", "SKILL.md"), "user's local copy\n");

    const result = installSkills({ catalogDir: catalog, targetDir: target, names: ["alpha"] });

    expect(result.skipped).toEqual(["alpha"]);
    expect(result.installed).toEqual([]);
    expect(readFileSync(join(target, "alpha", "SKILL.md"), "utf8")).toBe("user's local copy\n");
  });

  test("overwrites existing skills when overwrite is set", () => {
    const root = tempDir();
    const catalog = makeCatalog(root, ["alpha"]);
    const target = join(root, "target");
    mkdirSync(join(target, "alpha", "scripts"), { recursive: true });
    writeFileSync(join(target, "alpha", "SKILL.md"), "stale copy\n");
    writeFileSync(join(target, "alpha", "scripts", "legacy.sh"), "old helper removed from the catalog\n");

    const result = installSkills({ catalogDir: catalog, targetDir: target, names: ["alpha"], overwrite: true });

    expect(result.overwritten).toEqual(["alpha"]);
    expect(readFileSync(join(target, "alpha", "SKILL.md"), "utf8")).toBe("# alpha\n");
    expect(existsSync(join(target, "alpha", "scripts", "legacy.sh"))).toBe(false);
  });

  test("reports missing catalog skills as failures, leaving others installed", () => {
    const root = tempDir();
    const catalog = makeCatalog(root, ["alpha"]);
    const target = join(root, "target");

    const result = installSkills({ catalogDir: catalog, targetDir: target, names: ["alpha", "ghost"] });

    expect(result.installed).toEqual(["alpha"]);
    expect(result.failed).toEqual([{ name: "ghost", error: "not found in catalog: ghost" }]);
  });

  test("creates the target directory when it does not exist", () => {
    const root = tempDir();
    const catalog = makeCatalog(root, ["alpha"]);
    const target = join(root, "nested", "deep", "target");

    const result = installSkills({ catalogDir: catalog, targetDir: target, names: ["alpha"] });

    expect(result.installed).toEqual(["alpha"]);
    expect(existsSync(join(target, "alpha", "SKILL.md"))).toBe(true);
  });

  test("invokes onStatus for every requested skill in order", () => {
    const root = tempDir();
    const catalog = makeCatalog(root, ["a", "b"]);
    const target = join(root, "target");
    const seen: string[] = [];

    installSkills({ catalogDir: catalog, targetDir: target, names: ["a", "b"], onStatus: (n) => seen.push(n) });

    expect(seen).toEqual(["a", "b"]);
  });

  test("reports copy errors per skill without aborting the run", () => {
    const root = tempDir();
    const catalog = makeCatalog(root, ["alpha"]);
    const target = join(root, "target");
    mkdirSync(target, { recursive: true });
    // A plain file where the skill directory should go forces a copy error.
    writeFileSync(join(target, "alpha"), "a file blocks the directory\n");

    const result = installSkills({ catalogDir: catalog, targetDir: target, names: ["alpha"], overwrite: true });

    expect(result.installed).toEqual([]);
    expect(result.overwritten).toEqual([]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].name).toBe("alpha");
    expect(result.failed[0].error).toBeTruthy();
  });
});

describe("findConflicts", () => {
  test("returns only names already present in the target", () => {
    const root = tempDir();
    const target = join(root, "target");
    mkdirSync(join(target, "existing"), { recursive: true });

    expect(findConflicts(target, ["existing", "missing"])).toEqual(["existing"]);
    expect(findConflicts(target, [])).toEqual([]);
  });
});
