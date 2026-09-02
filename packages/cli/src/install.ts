import { createHash } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { safeSkillName } from "./agents.js";
import type { RegistrySkill } from "./registry.js";

export function skillHash(dir: string): string {
  const hash = createHash("sha256");
  const walk = (current: string) => { for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { const path = join(current, entry.name); if (entry.isDirectory()) walk(path); else { hash.update(relative(dir, path)); hash.update(readFileSync(path)); } } };
  walk(dir); return `sha256:${hash.digest("hex")}`;
}
function assertNoSymlinks(path: string): void {
  const absolute = resolve(path); const root = absolute.startsWith(sep) ? sep : ""; let current = root;
  for (const part of absolute.slice(root.length).split(sep).filter(Boolean)) { current = join(current, part); if (lstatSync(current, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error("target path cannot contain symlinks"); }
}
function assertTarget(targetDir: string): string {
  const target = resolve(targetDir); assertNoSymlinks(target); mkdirSync(target, { recursive: true });
  if (realpathSync(target) !== target) throw new Error("target path cannot contain symlinks");
  return target;
}
function assertCatalogSkill(dir: string, name: string): void {
  if (!lstatSync(dir, { throwIfNoEntry: false })?.isDirectory()) throw new Error(`invalid catalog entry: ${name}`);
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`catalog skill cannot contain symlinks: ${name}`);
    if (entry.isDirectory()) assertCatalogSkill(path, name);
  }
}
export function installSkill(skill: RegistrySkill, targetDir: string, overwrite = false): "installed" | "updated" | "skipped" {
  if (!safeSkillName(skill.name)) throw new Error(`unsafe skill name: ${skill.name}`);
  assertCatalogSkill(skill.dir, skill.name);
  const target = assertTarget(targetDir); const destination = resolve(target, skill.name);
  if (!destination.startsWith(target + sep)) throw new Error("skill destination escapes target directory");
  if (lstatSync(destination, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error("skill destination cannot be a symlink");
  if (existsSync(destination) && !overwrite) return "skipped";
  if (existsSync(destination)) rmSync(destination, { recursive: true, force: true });
  cpSync(skill.dir, destination, { recursive: true }); return overwrite ? "updated" : "installed";
}
export function removeSkill(name: string, targetDir: string): boolean {
  if (!safeSkillName(name)) throw new Error(`unsafe skill name: ${name}`); const target = assertTarget(targetDir); const path = resolve(target, name);
  if (lstatSync(path, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error("skill destination cannot be a symlink");
  if (!existsSync(path)) return false; rmSync(path, { recursive: true, force: true }); return true;
}
export function installedSkillNames(targetDir: string): string[] {
  const target = assertTarget(targetDir);
  return readdirSync(target, { withFileTypes: true }).filter((entry) => entry.isDirectory() && !entry.isSymbolicLink()).map((entry) => entry.name);
}
