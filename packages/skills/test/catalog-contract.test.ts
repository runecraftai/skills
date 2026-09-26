import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { directoryDigest, normalizeCatalogPath, parseFrontmatter, validateRegistry, validateTaxonomy, verifySkillFiles, type CatalogRegistry, type CatalogSkill } from "../src/catalog-contract.js";

const digest = (bytes: string) => createHash("sha256").update(bytes).digest("hex");
const goodSkill = (id = "sample"): CatalogSkill => ({ id, name: "Sample Skill", version: "1.0.0", category: "Testing", description: "Display only", license: "MIT", attribution: [{ name: "Runecraft", url: "https://github.com/runecraftai/skills", text: "Copyright Runecraft." }], entrypoint: "SKILL.md", files: [{ path: "SKILL.md", size: 4, sha256: digest("body") }], contentSha256: directoryDigest([{ path: "SKILL.md", bytes: Buffer.from("body") }]) });
const registry = (...skills: CatalogSkill[]): CatalogRegistry => ({ schemaVersion: 1, catalogVersion: "1.0.0", revision: "abc", generatedAt: "2026-09-26T00:00:00.000Z", skills });

describe("strict catalog contract", () => {
  test("generated catalog has 32 verified skills and matching taxonomy", async () => {
    const root = join(import.meta.dir, "..");
    const generated = JSON.parse(await readFile(join(root, "catalog/v1/registry.json"), "utf8")) as CatalogRegistry;
    validateRegistry(generated);
    expect(generated.skills).toHaveLength(32);
    expect(generated.skills.flatMap((skill) => skill.files).some((file) => /(?:__pycache__|\\.pyc$|node_modules|\\.DS_Store)/.test(file.path))).toBe(false);
    const taxonomy = JSON.parse(await readFile(join(root, "catalog.json"), "utf8")) as { categories: Record<string, string[]> };
    expect([...validateTaxonomy(taxonomy.categories).keys()].sort()).toEqual(generated.skills.map((skill) => skill.id).sort());
    for (const skill of generated.skills) await verifySkillFiles(skill, join(root, "catalog/v1/skills", skill.id));
  });
  test("directory digest has a pinned canonical vector", () => {
    expect(directoryDigest([{ path: "b.txt", bytes: Buffer.from("B") }, { path: "a.txt", bytes: Buffer.from("A") }])).toBe("831d4624c74d035968429722f3e6c4a2a83aa0f868cfe7fd8743182f0d3bfc16");
  });
  test("normalizes only valid relative slash-separated paths", () => {
    expect(normalizeCatalogPath("refs/a.md")).toBe("refs/a.md");
    for (const path of ["/etc/passwd", "../x", "a/../x", "a\\b", "a\u0000b"]) expect(() => normalizeCatalogPath(path)).toThrow();
    const escaping = goodSkill(); escaping.files[0]!.path = "../outside";
    expect(() => validateRegistry(registry(escaping))).toThrow();
  });
  test("accepts valid registry and rejects invalid schema and duplicate ids", () => {
    expect(() => validateRegistry(registry(goodSkill()))).not.toThrow();
    expect(() => validateRegistry({ ...registry(goodSkill()), extra: true })).toThrow();
    expect(() => validateRegistry(registry(goodSkill(), goodSkill()))).toThrow();
  });
  test("rejects path collisions and missing entrypoints", () => {
    const collision = goodSkill(); collision.files.push({ ...collision.files[0]! });
    expect(() => validateRegistry(registry(collision))).toThrow();
    const prefixCollision = goodSkill(); prefixCollision.files.push({ path: "SKILL.md/child", size: 0, sha256: digest("") });
    expect(() => validateRegistry(registry(prefixCollision))).toThrow();
    const missing = goodSkill(); missing.files = [];
    expect(() => validateRegistry(registry(missing))).toThrow();
  });
  test("rejects invalid license and malformed frontmatter", () => {
    const unsupported = goodSkill(); unsupported.license = "UNLICENSED";
    expect(() => validateRegistry(registry(unsupported))).toThrow();
    expect(() => parseFrontmatter("name: missing delimiters")).toThrow();
    expect(() => parseFrontmatter("---\nname: [broken\ndescription: x\nlicense: MIT\n---\n")).toThrow();
  });
  test("rejects duplicate category membership in the taxonomy contract", () => {
    expect(() => validateTaxonomy({ A: ["sample"], B: ["sample"] })).toThrow("Duplicate category membership");
  });
  test("rejects file and directory digest mismatches", async () => {
    const root = await mkdtemp(join(tmpdir(), "catalog-contract-"));
    try {
      await writeFile(join(root, "SKILL.md"), "evil");
      await expect(verifySkillFiles(goodSkill(), root)).rejects.toThrow("Digest mismatch");
      await writeFile(join(root, "SKILL.md"), "body");
      const altered = goodSkill(); altered.contentSha256 = "0".repeat(64);
      await expect(verifySkillFiles(altered, root)).rejects.toThrow("Directory digest mismatch");
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  test("rejects declared symlinks and excludes artifact directories from path rules", async () => {
    const root = await mkdtemp(join(tmpdir(), "catalog-contract-"));
    try {
      await mkdir(join(root, "nested"));
      await writeFile(join(root, "nested", "file"), "body");
      const skill = goodSkill(); skill.files[0]!.path = "nested/file"; skill.entrypoint = "nested/file";
      skill.files[0]!.size = 4; skill.files[0]!.sha256 = digest("body"); skill.contentSha256 = directoryDigest([{ path: "nested/file", bytes: Buffer.from("body") }]);
      await expect(verifySkillFiles(skill, root)).resolves.toBeUndefined();
      await symlink(join(root, "nested", "file"), join(root, "link"));
      skill.files[0]!.path = "link"; skill.entrypoint = "link";
      await expect(verifySkillFiles(skill, root)).rejects.toThrow("not regular");
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
