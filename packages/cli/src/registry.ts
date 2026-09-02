import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface RegistrySkill { name: string; description: string; version: string; dir: string; }
function frontmatter(raw: string): { name?: string; description?: string } {
  const body = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw)?.[1] ?? "";
  const value = (key: string) => body.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1].trim().replace(/^['"]|['"]$/g, "");
  const description = body.match(/^description:\s*>[+-]?\s*([\s\S]*?)(?=^\S|$)/m)?.[1]
    ?.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).join(" ");
  return { name: value("name"), description: description ?? value("description") };
}
export function readRegistry(catalogDir: string): RegistrySkill[] {
  if (!existsSync(catalogDir)) return [];
  return readdirSync(catalogDir, { withFileTypes: true }).filter((e) => e.isDirectory() && existsSync(join(catalogDir, e.name, "SKILL.md"))).map((e) => {
    const dir = join(catalogDir, e.name);
    let meta: Partial<RegistrySkill> = {};
    try { meta = JSON.parse(readFileSync(join(dir, ".skill-meta.json"), "utf8")); } catch {}
    const front = frontmatter(readFileSync(join(dir, "SKILL.md"), "utf8"));
    return { name: meta.name ?? front.name ?? e.name, description: meta.description ?? front.description ?? "", version: meta.version ?? "0.1.0", dir };
  }).sort((a, b) => a.name.localeCompare(b.name));
}
export function findSkill(catalogDir: string, name: string): RegistrySkill | undefined { return readRegistry(catalogDir).find((skill) => skill.name === name); }
