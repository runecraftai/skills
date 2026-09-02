import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readRegistry } from "../src/registry.js";

const root = join(import.meta.dir, "..");
const catalog = JSON.parse(readFileSync(join(root, "catalog.json"), "utf8")) as { categories: Record<string, string[]> };
const readme = readFileSync(join(root, "..", "..", "README.md"), "utf8");
const skillsDir = join(root, "skills");
const shipped = readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(skillsDir, entry.name, "SKILL.md")))
  .map((entry) => entry.name);
const registry = readRegistry(skillsDir);

describe("catalog taxonomy", () => {
  test("assigns every shipped skill exactly once", () => {
    const assigned = Object.values(catalog.categories).flat();
    expect(new Set(assigned).size).toBe(assigned.length);
    expect(assigned.sort()).toEqual(shipped.sort());
    expect(Object.keys(catalog.categories).every((name) => name.trim().length > 0)).toBe(true);
  });

  test("documents every catalog skill exactly once in the README table", () => {
    const rows = readme.split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("|") && !line.includes("---"))
      .map((line) => line.slice(1, -1).split("|").map((cell) => cell.trim()))
      .filter(([category]) => category !== "Category");
    const documented = new Map(rows.map(([category, skill, description]) => [skill.replace(/^`|`$/g, ""), { category, description }]));

    expect(rows).toHaveLength(shipped.length);
    expect(documented.size).toBe(shipped.length);
    for (const name of shipped) {
      const entry = registry.find((skill) => skill.dir === join(skillsDir, name));
      const row = documented.get(name);
      expect(row?.category).toBe(Object.entries(catalog.categories).find(([, names]) => names.includes(name))?.[0]);
      expect(row?.description.length).toBeGreaterThan(0);
      expect(entry?.description.length).toBeGreaterThan(0);
    }
  });
});
