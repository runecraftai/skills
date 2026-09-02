import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface RegistrySkill { name: string; description: string; version: string; dir: string; category?: string; }
export interface CatalogCategory { name: string; skills: RegistrySkill[]; }
function frontmatter(raw: string): { name?: string; description?: string } {
  const body = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw)?.[1] ?? "";
  const value = (key: string) => body.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1].trim().replace(/^['"]|['"]$/g, "");
  const description = body.match(/^description:\s*>[+-]?\s*([\s\S]*?)(?=^\S|$)/m)?.[1]?.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).join(" ");
  return { name: value("name"), description: description ?? value("description") };
}
function categoryMap(catalogDir: string): Map<string, string> {
  try {
    const raw = JSON.parse(readFileSync(join(catalogDir, "..", "catalog.json"), "utf8"));
    const map = new Map<string, string>();
    for (const [category, names] of Object.entries(raw.categories ?? {})) for (const name of names as string[]) map.set(name, category);
    return map;
  } catch { return new Map(); }
}
export function readRegistry(catalogDir: string): RegistrySkill[] {
  if (!existsSync(catalogDir)) return [];
  const categories = categoryMap(catalogDir);
  return readdirSync(catalogDir, { withFileTypes: true }).filter((e) => e.isDirectory() && existsSync(join(catalogDir, e.name, "SKILL.md"))).map((e) => {
    const dir = join(catalogDir, e.name); let meta: Partial<RegistrySkill> = {};
    try { meta = JSON.parse(readFileSync(join(dir, ".skill-meta.json"), "utf8")); } catch {}
    const front = frontmatter(readFileSync(join(dir, "SKILL.md"), "utf8"));
    return { name: meta.name ?? front.name ?? e.name, description: meta.description ?? front.description ?? "", version: meta.version ?? "0.1.0", dir, category: categories.get(e.name) ?? "Other" };
  }).sort((a, b) => a.name.localeCompare(b.name));
}
export const listSkills = readRegistry;

export function categories(registry: RegistrySkill[]): CatalogCategory[] {
  const grouped = new Map<string, RegistrySkill[]>();
  for (const skill of registry) { const category = skill.category ?? "Other"; grouped.set(category, [...(grouped.get(category) ?? []), skill]); }
  return [...grouped].sort(([a], [b]) => a.localeCompare(b)).map(([name, skills]) => ({ name, skills }));
}
export function findSkill(catalogDir: string, name: string): RegistrySkill | undefined { return readRegistry(catalogDir).find((skill) => skill.name === name); }
