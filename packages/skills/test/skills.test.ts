import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { listSkills, parseSkillFrontmatter, readSkill } from "../src/skills.js";

let dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  dirs = [];
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "skills-listing-"));
  dirs.push(dir);
  return dir;
}

function makeSkill(catalog: string, name: string, files: Record<string, string>): string {
  const dir = join(catalog, name);
  mkdirSync(dir, { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const target = join(dir, rel);
    mkdirSync(target.slice(0, target.lastIndexOf("/")), { recursive: true });
    writeFileSync(target, content);
  }
  return dir;
}

const FULL_FRONTMATTER = `---
name: sample-skill
description: >
  A skill that does the thing, spread across
  multiple folded lines for readability.
license: CC-BY-4.0
---

# Sample
`;

describe("listSkills", () => {
  test("lists skill folders that contain SKILL.md, sorted by name", () => {
    const catalog = tempDir();
    makeSkill(catalog, "zeta", { "SKILL.md": "---\nname: zeta\n---\n" });
    makeSkill(catalog, "alpha", { "SKILL.md": "---\nname: alpha\n---\n" });
    makeSkill(catalog, "not-a-skill", { "README.md": "no SKILL.md here" });
    writeFileSync(join(catalog, "plain-file.txt"), "ignored");

    const skills = listSkills(catalog);
    expect(skills.map((s) => s.name)).toEqual(["alpha", "zeta"]);
  });

  test("reads name and folded description from frontmatter", () => {
    const catalog = tempDir();
    makeSkill(catalog, "sample-skill", { "SKILL.md": FULL_FRONTMATTER });
    const [skill] = listSkills(catalog);
    expect(skill.name).toBe("sample-skill");
    expect(skill.description).toBe("A skill that does the thing, spread across multiple folded lines for readability.");
  });

  test("falls back to folder name and empty description", () => {
    const catalog = tempDir();
    makeSkill(catalog, "bare-skill", { "SKILL.md": "# Bare\n" });
    const [skill] = listSkills(catalog);
    expect(skill.name).toBe("bare-skill");
    expect(skill.description).toBe("");
    expect(skill.version).toBeUndefined();
  });

  test("prefers .skill-meta.json over frontmatter", () => {
    const catalog = tempDir();
    makeSkill(catalog, "rich-skill", {
      "SKILL.md": FULL_FRONTMATTER,
      ".skill-meta.json": JSON.stringify({ name: "rich-skill", version: "9.9.9", description: "From meta" }),
    });
    const [skill] = listSkills(catalog);
    expect(skill.name).toBe("rich-skill");
    expect(skill.description).toBe("From meta");
    expect(skill.version).toBe("9.9.9");
  });

  test("reads metadata.version from nested frontmatter", () => {
    const catalog = tempDir();
    makeSkill(catalog, "versioned", {
      "SKILL.md": "---\nname: versioned\ndescription: d\nmetadata:\n  version: 5.0.0\n---\n",
    });
    const [skill] = listSkills(catalog);
    expect(skill.version).toBe("5.0.0");
  });

  test("returns [] for a missing or empty catalog directory", () => {
    expect(listSkills(join(tempDir(), "does-not-exist"))).toEqual([]);
    expect(listSkills(tempDir())).toEqual([]);
  });
});

describe("parseSkillFrontmatter", () => {
  test("parses scalar name and folded description", () => {
    const parsed = parseSkillFrontmatter(FULL_FRONTMATTER);
    expect(parsed.name).toBe("sample-skill");
    expect(parsed.description).toContain("spread across multiple folded lines");
  });

  test("returns {} without a frontmatter block", () => {
    expect(parseSkillFrontmatter("# no frontmatter")).toEqual({});
  });

  test("parses a single-line description", () => {
    expect(parseSkillFrontmatter("---\nname: x\ndescription: short and sweet\n---\n").description).toBe("short and sweet");
  });

  test("extracts version from a nested metadata map", () => {
    const parsed = parseSkillFrontmatter("---\nname: x\nmetadata:\n  version: \"1.2.3\"\n---\n");
    expect(parsed.version).toBe("1.2.3");
  });
});

describe("readSkill", () => {
  test("survives an unreadable SKILL.md by falling back to the folder name", () => {
    const catalog = tempDir();
    const dir = join(catalog, "broken");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "SKILL.md"), "");
    const skill = readSkill(dir);
    expect(skill.name).toBe("broken");
    expect(skill.description).toBe("");
  });
});
