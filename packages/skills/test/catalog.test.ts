import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const catalog = JSON.parse(readFileSync(join(root, "catalog.json"), "utf8")) as { categories: Record<string, string[]> };
const readme = readFileSync(join(root, "..", "..", "README.md"), "utf8");
const shipped = readdirSync(join(root, "skills"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(root, "skills", entry.name, "SKILL.md")))
  .map((entry) => entry.name);

describe("catalog taxonomy", () => {
  test("assigns every shipped skill exactly once", () => {
    const assigned = Object.values(catalog.categories).flat();
    expect(new Set(assigned).size).toBe(assigned.length);
    expect(assigned.sort()).toEqual(shipped.sort());
    expect(Object.keys(catalog.categories).every((name) => name.trim().length > 0)).toBe(true);
  });

  test("documents every catalog skill exactly once in the README table", () => {
    for (const name of shipped) expect(readme.split("\\n").filter((line) => line.includes(`| \`${name}\` |`)).length).toBe(1);
  });
});
