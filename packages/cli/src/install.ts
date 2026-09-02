import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { safeSkillName } from "./agents.js";
import type { RegistrySkill } from "./registry.js";
export function skillHash(dir: string): string {
  const hash = createHash("sha256");
  const walk = (current: string) => { for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { const path = join(current, entry.name); if (entry.isDirectory()) walk(path); else { hash.update(relative(dir, path)); hash.update(readFileSync(path)); } } };
  walk(dir); return `sha256:${hash.digest("hex")}`;
}
export function installSkill(skill: RegistrySkill, targetDir: string, overwrite = false): "installed" | "updated" | "skipped" {
  if (!safeSkillName(skill.name)) throw new Error(`unsafe skill name: ${skill.name}`);
  const destination = resolve(targetDir, skill.name);
  if (!destination.startsWith(resolve(targetDir) + "/")) throw new Error("skill destination escapes target directory");
  mkdirSync(targetDir, { recursive: true });
  if (existsSync(destination) && !overwrite) return "skipped";
  if (existsSync(destination)) rmSync(destination, { recursive: true, force: true });
  if (!statSync(skill.dir).isDirectory()) throw new Error(`invalid catalog entry: ${skill.name}`);
  cpSync(skill.dir, destination, { recursive: true }); return overwrite ? "updated" : "installed";
}
export function removeSkill(name: string, targetDir: string): boolean { if (!safeSkillName(name)) throw new Error(`unsafe skill name: ${name}`); const path = resolve(targetDir, name); if (!existsSync(path)) return false; rmSync(path, { recursive: true, force: true }); return true; }
