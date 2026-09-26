import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateCatalog } from "../src/catalog-contract.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tag = process.env.GITHUB_REF_NAME;
if (!tag || !/^catalog-v\d+\.\d+\.\d+$/.test(tag)) throw new Error("Release must run from a catalog-vX.Y.Z tag");
const version = tag.slice("catalog-v".length);
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
if (pkg.version !== version) throw new Error(`Tag ${version} does not match package version ${pkg.version}`);
const source = join(root, "catalog/v1");
const current = JSON.parse(await readFile(join(source, "registry.json"), "utf8"));
if (current.catalogVersion !== version) throw new Error(`Tag ${version} does not match generated catalog ${current.catalogVersion}`);
const revision = current.revision;
const generatedAt = current.generatedAt;
const rebuilt = join(root, ".catalog-release-check");
await generateCatalog({ skillsRoot: join(root, "skills"), outputRoot: rebuilt, taxonomyPath: join(root, "catalog.json"), catalogVersion: version, revision, generatedAt });
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const rebuiltRegistry = JSON.parse(await readFile(join(rebuilt, "registry.json"), "utf8"));
if (!equal(current, rebuiltRegistry)) throw new Error("Strict catalog rebuild differs from the checked-in registry");
for (const skill of current.skills) for (const file of skill.files) {
  const expected = await readFile(join(source, "skills", skill.id, ...file.path.split("/")));
  const actual = await readFile(join(rebuilt, "skills", skill.id, ...file.path.split("/")));
  if (!expected.equals(actual)) throw new Error(`Strict catalog rebuild differs: ${skill.id}/${file.path}`);
}
await rm(rebuilt, { recursive: true, force: true });
const registry = await readFile(join(source, "registry.json"));
const sha256 = createHash("sha256").update(registry).digest("hex");
const artifactRoot = join(root, "release-artifact");
await mkdir(join(artifactRoot, "catalog"), { recursive: true });
await cp(source, join(artifactRoot, "catalog/v1"), { recursive: true });
await writeFile(join(artifactRoot, "stable.json"), `${JSON.stringify({ schemaVersion: 1, catalogVersion: version, revision, registry: `https://cdn.jsdelivr.net/gh/runecraftai/skills@${tag}/packages/skills/catalog/v1/registry.json`, sha256 }, null, 2)}\n`);
await writeFile(join(artifactRoot, "catalog/v1/registry.sha256"), `${sha256}  registry.json\n`);
console.log(`Built ${tag} catalog (${sha256})`);
