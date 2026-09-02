import { existsSync, lstatSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
export interface LockedSkill { version: string; hash: string; installed: string; agents: string[]; }
export interface Lockfile { version: 1; generated: string; registry: string; skills: Record<string, LockedSkill>; }
export function lockPath(projectDir: string): string { return join(projectDir, ".grimoire-lock.json"); }
function assertLockfilePath(projectDir: string): string {
  const path = lockPath(projectDir);
  if (lstatSync(path, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error("lockfile cannot be a symlink");
  return path;
}
export function readLockfile(projectDir: string): Lockfile {
  const path = assertLockfilePath(projectDir);
  try { const lock = JSON.parse(readFileSync(path, "utf8")); if (lock.version === 1 && lock.skills) return lock; } catch {}
  return { version: 1, generated: new Date().toISOString(), registry: "runecraftai/grimoire", skills: {} };
}
export function writeLockfile(projectDir: string, lock: Lockfile): void { writeFileSync(assertLockfilePath(projectDir), `${JSON.stringify(lock, null, 2)}\n`); }
export function updateLock(lock: Lockfile, name: string, entry: LockedSkill): Lockfile {
  const existing = lock.skills[name];
  lock.generated = new Date().toISOString();
  lock.skills[name] = existing
    ? { ...entry, agents: [...new Set([...existing.agents, ...entry.agents])] }
    : entry;
  return lock;
}
export function removeLock(lock: Lockfile, name: string): boolean { const existed = Boolean(lock.skills[name]); delete lock.skills[name]; lock.generated = new Date().toISOString(); return existed; }
export function removeLockAgent(lock: Lockfile, name: string, agent: string): boolean {
  const entry = lock.skills[name]; if (!entry) return false;
  entry.agents = entry.agents.filter((id) => id !== agent); if (!entry.agents.length) delete lock.skills[name]; lock.generated = new Date().toISOString(); return true;
}
export function hasLockfile(projectDir: string): boolean { return existsSync(assertLockfilePath(projectDir)); }
