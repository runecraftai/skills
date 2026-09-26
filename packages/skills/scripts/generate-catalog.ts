import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateCatalog } from "../src/catalog-contract.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const revision = process.env.CATALOG_REVISION || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const timestamp = process.env.CATALOG_GENERATED_AT || execFileSync("git", ["show", "-s", "--format=%cI", revision], { encoding: "utf8" }).trim();
const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const taxonomyPath = join(root, "catalog.json");
const registry = await generateCatalog({ skillsRoot: join(root, "skills"), outputRoot: join(root, "catalog/v1"), taxonomyPath, catalogVersion: packageJson.version, revision, generatedAt: new Date(timestamp).toISOString() });
const categories: Record<string, string[]> = {};
for (const skill of registry.skills) (categories[skill.category] ??= []).push(skill.id);
for (const ids of Object.values(categories)) ids.sort();
await writeFile(taxonomyPath, `${JSON.stringify({ categories }, null, 2)}\n`);
console.log(`Generated schema v1 registry with ${registry.skills.length} skills.`);
