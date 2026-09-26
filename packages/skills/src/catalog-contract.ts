import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readdir, rm, writeFile, copyFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

export type CatalogFile = { path: string; size: number; sha256: string };
export type CatalogSkill = { id: string; name: string; version: string; category: string; description: string; license: string; attribution: { name: string; url: string; text: string }[]; entrypoint: string; files: CatalogFile[]; contentSha256: string };
export type CatalogRegistry = { schemaVersion:  1; catalogVersion: string; revision: string; generatedAt: string; skills: CatalogSkill[] };
const LICENSES = new Set(["MIT", "CC-BY-4.0"]);
const EXCLUDED = new Set([".git", ".svn", ".hg", ".DS_Store", "Thumbs.db", "__pycache__", ".cache", "node_modules", ".turbo"]);

export function normalizeCatalogPath(path: string): string {
  if (!path || path.startsWith("/") || /^[A-Za-z]:/.test(path) || path.includes("\\") || /[\u0000-\u001f\u007f]/.test(path)) throw new Error(`Invalid catalog path: ${path}`);
  const parts = path.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) throw new Error(`Invalid catalog path: ${path}`);
  return parts.join("/");
}

export function directoryDigest(files: { path: string; bytes: Uint8Array }[]): string {
  const hash = createHash("sha256");
  const sorted = [...files].sort((a, b) => Buffer.compare(Buffer.from(a.path, "utf8"), Buffer.from(b.path, "utf8")));
  for (const file of sorted) {
    hash.update(normalizeCatalogPath(file.path), "utf8");
    hash.update(Buffer.from([0]));
    hash.update(file.bytes);
  }
  return hash.digest("hex");
}

export function validateRegistry(value: unknown): asserts value is CatalogRegistry {
  if (!isRecord(value) || Object.keys(value).sort().join(",") !== "catalogVersion,generatedAt,revision,schemaVersion,skills" || value.schemaVersion !== 1 || !nonempty(value.catalogVersion) || !nonempty(value.revision) || !nonempty(value.generatedAt) || Number.isNaN(Date.parse(value.generatedAt)) || !Array.isArray(value.skills)) throw new Error("Invalid registry schema");
  const ids = new Set<string>();
  const categories = new Set<string>();
  const seenPaths = new Set<string>();
  for (const skill of value.skills) {
    if (!isRecord(skill)) throw new Error("Invalid skill entry: not an object");
    if (Object.keys(skill).sort().join(",") !== "attribution,category,contentSha256,description,entrypoint,files,id,license,name,version") throw new Error(`Invalid skill schema: unexpected keys for ${skill.id ?? "<unknown>"}`);
    if (!nonempty(skill.id)) throw new Error("Skill entry missing id");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill.id)) throw new Error(`Invalid skill id format: ${skill.id}`);
    if (ids.has(skill.id)) throw new Error(`Duplicate skill id: ${skill.id}`);
    if (!nonempty(skill.name)) throw new Error(`Missing name for skill ${skill.id}`);
    if (!nonempty(skill.version)) throw new Error(`Missing version for skill ${skill.id}`);
    if (!nonempty(skill.category)) throw new Error(`Missing category for skill ${skill.id}`);
    if (categories.has(skill.category + "\0" + skill.id)) throw new Error(`Duplicate category membership: ${skill.id} in ${skill.category}`);
    if (!nonempty(skill.description)) throw new Error(`Missing description for skill ${skill.id}`);
    if (!LICENSES.has(String(skill.license))) throw new Error(`Unsupported license for skill ${skill.id}: ${skill.license}`);
    if (!Array.isArray(skill.attribution) || !skill.attribution.length) throw new Error(`Missing or empty attribution for skill ${skill.id}`);
    if (!nonempty(skill.entrypoint)) throw new Error(`Missing entrypoint for skill ${skill.id}`);
    if (!Array.isArray(skill.files)) throw new Error(`Missing files array for skill ${skill.id}`);
    if (!/^[a-f0-9]{64}$/.test(String(skill.contentSha256))) throw new Error(`Invalid contentSha256 for skill ${skill.id}`);
    ids.add(skill.id); categories.add(skill.category + "\0" + skill.id);
    const paths = new Set<string>();
    const bytes: { path: string; bytes: Uint8Array }[] = [];
    for (const file of skill.files) {
      if (!isRecord(file)) throw new Error(`Invalid file entry in skill ${skill.id}: not an object`);
      if (Object.keys(file).sort().join(",") !== "path,sha256,size") throw new Error(`Invalid file entry schema in skill ${skill.id}: unexpected keys`);
      if (typeof file.path !== "string") throw new Error(`File entry in skill ${skill.id} missing path string`);
      if (normalizeCatalogPath(file.path) !== file.path) throw new Error(`Invalid file path in skill ${skill.id}: ${file.path}`);
      if (paths.has(file.path)) throw new Error(`Duplicate file path in skill ${skill.id}: ${file.path}`);
      if (!Number.isSafeInteger(file.size) || Number(file.size) < 0) throw new Error(`Invalid file size for ${file.path} in skill ${skill.id}`);
      if (!/^[a-f0-9]{64}$/.test(String(file.sha256))) throw new Error(`Invalid sha256 for file ${file.path} in skill ${skill.id}`);
      for (const existing of paths) if (existing.startsWith(`${file.path}/`) || file.path.startsWith(`${existing}/`)) throw new Error("Path collision");
      paths.add(file.path);
      const key = `${skill.id}/${file.path}`;
      if (seenPaths.has(key)) throw new Error("Path collision");
      seenPaths.add(key);
      if (file.path === skill.entrypoint) bytes.push({ path: file.path, bytes: new Uint8Array() });
    }
    if (!paths.has(skill.entrypoint)) throw new Error(`Missing entrypoint for ${skill.id}`);
    for (const attr of skill.attribution) if (!isRecord(attr) || !nonempty(attr.name) || !nonempty(attr.text) || !validUrl(attr.url)) throw new Error("Invalid attribution");
    // Digest is verified against copied bytes by verifySkillFiles; schema validation checks syntax.
    void bytes;
  }
}

export async function verifySkillFiles(skill: CatalogSkill, root: string): Promise<void> {
  const content: { path: string; bytes: Uint8Array }[] = [];
  for (const file of skill.files) {
    const path = normalizeCatalogPath(file.path);
    const absolute = resolve(root, ...path.split("/"));
    if (!absolute.startsWith(resolve(root) + sep)) throw new Error("File escapes skill root");
    const stat = await lstat(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Declared file is not regular");
    const bytes = await readFile(absolute);
    if (bytes.byteLength !== file.size || createHash("sha256").update(bytes).digest("hex") !== file.sha256) throw new Error(`Digest mismatch: ${file.path}`);
    content.push({ path, bytes });
  }
  if (directoryDigest(content) !== skill.contentSha256) throw new Error("Directory digest mismatch");
}

export async function generateCatalog(options: { skillsRoot: string; outputRoot: string; taxonomyPath: string; catalogVersion: string; revision: string; generatedAt: string }): Promise<CatalogRegistry> {
  const taxonomy = JSON.parse(await readFile(options.taxonomyPath, "utf8")) as { categories?: Record<string, string[]> };
  if (!taxonomy.categories) throw new Error("Invalid taxonomy");
  const categoryById = validateTaxonomy(taxonomy.categories);
  const entries = (await readdir(options.skillsRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory() && !EXCLUDED.has(entry.name)).sort((a, b) => a.name.localeCompare(b.name, "en"));
  const skills: CatalogSkill[] = [];
  const staging = join(options.outputRoot, "skills");
  await rm(options.outputRoot, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });
  for (const entry of entries) {
    const id = entry.name;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !categoryById.has(id)) throw new Error(`Invalid id or missing category: ${id}`);
    const dir = join(options.skillsRoot, id);
    const source = join(dir, "SKILL.md");
    const stat = await lstat(source);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Missing regular entrypoint: ${id}`);
    const text = await readFile(source, "utf8");
    const fm = parseFrontmatter(text);
    if (fm.name !== id || !fm.description?.trim() || !LICENSES.has(fm.license ?? "")) throw new Error(`Invalid frontmatter/license for ${id}`);
    const upstream = fm.upstream || `Runecraft-authored; source revision ${options.revision}`;
    const name = fm.author || (fm.upstream ? upstream.split(/[,(]/)[0].trim() : "Runecraft");
    const attributionText = fm.upstream ? `${upstream}; catalog source revision ${options.revision}.` : `Copyright Runecraft. ${upstream}.`;
    const attributionUrl = fm.upstream?.match(/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/)?.[1];
    const files: CatalogFile[] = [];
    const content: { path: string; bytes: Uint8Array }[] = [];
    async function walk(folder: string, rel = ""): Promise<void> {
      for (const child of await readdir(folder, { withFileTypes: true })) {
        if (EXCLUDED.has(child.name) || child.name.startsWith(".")) continue;
        const childRel = rel ? `${rel}/${child.name}` : child.name;
        normalizeCatalogPath(childRel);
        const full = join(folder, child.name);
        const childStat = await lstat(full);
        if (childStat.isSymbolicLink()) throw new Error(`Symlink not allowed: ${id}/${childRel}`);
        if (childStat.isDirectory()) await walk(full, childRel);
        else if (childStat.isFile()) {
          const bytes = await readFile(full);
          files.push({ path: childRel, size: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") });
          content.push({ path: childRel, bytes });
        }
      }
    }
    await walk(dir);
    files.sort((a, b) => a.path.localeCompare(b.path, "en"));
    const skill: CatalogSkill = { id, name: fm.name || id, version: fm.version || "1.0.0", category: categoryById.get(id)!, description: fm.description.trim(), license: fm.license!, attribution: [{ name, url: `https://github.com/${attributionUrl || "runecraftai/skills"}`, text: attributionText }], entrypoint: "SKILL.md", files, contentSha256: directoryDigest(content) };
    skills.push(skill);
    for (const file of files) {
      const destination = join(staging, id, ...file.path.split("/"));
      await mkdir(join(destination, ".."), { recursive: true });
      await copyFile(join(dir, ...file.path.split("/")), destination);
    }
    await verifySkillFiles(skill, join(staging, id));
  }
  if (categoryById.size !== skills.length) throw new Error("Taxonomy contains unknown skill ids");
  const registry: CatalogRegistry = { schemaVersion: 1, catalogVersion: options.catalogVersion, revision: options.revision, generatedAt: options.generatedAt, skills };
  validateRegistry(registry);
  await writeFile(join(options.outputRoot, "registry.json"), `${JSON.stringify(registry, null, 2)}\n`);
  return registry;
}

export function parseFrontmatter(text: string): Record<string, string> {
  if (!text.startsWith("---\n")) throw new Error("Malformed frontmatter: missing opening delimiter");
  const end = text.indexOf("\n---", 4);
  if (end < 0) throw new Error("Malformed frontmatter: missing closing delimiter");
  const lines = text.slice(4, end).split(/\r?\n/);
  const result: Record<string, string> = {};
  let section = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (/^\S/.test(line)) {
      const match = line.match(/^([A-Za-z][\w-]*):(?:\s*(.*))?$/);
      if (!match) throw new Error(`Malformed frontmatter line: ${line}`);
      section = match[1]!;
      if (match[2] === ">" || match[2] === "|") {
        const values: string[] = [];
        while (i + 1 < lines.length && /^\s+/.test(lines[i + 1]!)) values.push(lines[++i]!.trim());
        result[section] = values.join(match[2] === ">" ? " " : "\n");
      } else if (match[2]) result[section] = unquote(match[2]);
      else result[section] = "";
    } else if (section === "metadata") {
      const match = line.match(/^\s+([A-Za-z][\w-]*):\s*(.+)$/);
      if (!match) throw new Error(`Malformed metadata frontmatter line: ${line}`);
      result[match[1]!] = unquote(match[2]!);
    } else throw new Error(`Unexpected frontmatter indentation: ${line}`);
  }
  if (!result.name || !result.description || !result.license) throw new Error("Malformed frontmatter: name, description, and license are required");
  return result;
}
function unquote(value: string): string { const v = value.trim(); if ((v.startsWith('"') && !v.endsWith('"')) || (v.startsWith("'") && !v.endsWith("'")) || (v.startsWith("[") && !v.endsWith("]")) || (v.startsWith("{") && !v.endsWith("}"))) throw new Error(`Malformed frontmatter scalar: ${v}`); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1); return v; }
export function validateTaxonomy(categories: Record<string, string[]>): Map<string, string> {
  const result = new Map<string, string>();
  for (const [category, ids] of Object.entries(categories)) {
    if (!category.trim() || !Array.isArray(ids)) throw new Error("Invalid taxonomy");
    for (const id of ids) { if (result.has(id)) throw new Error(`Duplicate category membership: ${id}`); result.set(id, category); }
  }
  return result;
}
function isRecord(value: unknown): value is Record<string, any> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function nonempty(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function validUrl(value: unknown): boolean { try { return new URL(String(value)).protocol === "https:"; } catch { return false; } }
