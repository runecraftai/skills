import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
export interface OwnedRecord { destination: string; scope: "project" | "global"; files: Record<string, string>; identity: string; }
export interface LockedSkill { version: string; hash: string; installed: string; agents: string[]; contentSha256?: string; fileHashes?: Record<string, string>; targets?: Record<string, string>; tuiTargets?: Record<string, OwnedRecord>; license?: string; attribution?: { name: string; url: string; text: string }[]; }
export interface Lockfile { version: 2; generated: string; registry: string; catalogUrl: string; catalogId: string; revision: string; skills: Record<string, LockedSkill>; }
export function lockPath(projectDir: string): string { return join(projectDir, ".grimoire-lock.json"); }
export function tuiOwnershipKey(target: string, scope: "project" | "global"): string { return `${target}:${scope}`; }
export function tuiScopeKeys(entry: LockedSkill | undefined, target: string): string[] {
  return Object.keys(entry?.tuiTargets ?? {}).filter((key) => key.startsWith(`${target}:`));
}
export function removeScopeOwnership(lock: Lockfile, name: string, target: string, scope: "project" | "global"): void {
  const entry = lock.skills[name];
  if (!entry) return;
  clearScopeOwnership(entry, target, scope);
  if (!entry.agents.length && !entry.tuiTargets && !entry.targets) delete lock.skills[name];
}
export function clearScopeOwnership(entry: LockedSkill, target: string, scope: "project" | "global"): void {
  const records = entry.tuiTargets ?? {};
  const ownedKey = tuiOwnershipKey(target, scope);
  const hadOwnedRecord = Boolean(records[ownedKey]);
  const hasTargetRecords = tuiScopeKeys(entry, target).length > 0;
  if (hadOwnedRecord) delete records[ownedKey];
  const retained = Object.entries(records).filter(([key]) => key.startsWith(`${target}:`));
  if (entry.tuiTargets && !Object.keys(records).length) delete entry.tuiTargets;
  const ownsShared = hadOwnedRecord || (!hasTargetRecords && scope === "project");
  if (!ownsShared) return;
  if (retained.length) { if (entry.targets) entry.targets[target] = retained[0][1].destination; return; }
  if (entry.targets) { delete entry.targets[target]; if (!Object.keys(entry.targets).length) delete entry.targets; }
  entry.agents = entry.agents.filter((id) => id !== target);
}
export function verifyTree(dir: string, expected: Record<string, string>): { modified: string[]; missing: string[] } {
  const modified: string[] = [], missing: string[] = [];
  for (const [path, hash] of Object.entries(expected)) {
    try { const actual = createHash("sha256").update(readFileSync(join(dir, path))).digest("hex"); if (actual !== hash) modified.push(path); }
    catch { missing.push(path); }
  }
  return { modified, missing };
}
export function verifyOwnedRecord(record: OwnedRecord): { modified: string[]; missing: string[] } {
  return verifyTree(record.destination, record.files);
}
function assertLockfilePath(projectDir: string): string {
  const path = lockPath(projectDir);
  if (lstatSync(path, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error("lockfile cannot be a symlink");
  return path;
}
export function readLockfile(projectDir: string): Lockfile {
  const path = assertLockfilePath(projectDir);
  try {
    const lock = JSON.parse(readFileSync(path, "utf8"));
    if ((lock.version === 1 || lock.version === 2) && lock.skills) return { version: 2, generated: lock.generated ?? new Date().toISOString(), registry: lock.registry ?? "runecraftai/grimoire", catalogUrl: lock.catalogUrl ?? "", catalogId: lock.catalogId ?? "runecraftai/skills", revision: lock.revision ?? "legacy", skills: lock.skills };
  } catch {}
  return { version: 2, generated: new Date().toISOString(), registry: "runecraftai/grimoire", catalogUrl: "", catalogId: "runecraftai/skills", revision: "local", skills: {} };
}
export function writeLockfile(projectDir: string, lock: Lockfile): void { writeFileSync(assertLockfilePath(projectDir), `${JSON.stringify(lock, null, 2)}\n`); }
export function updateLock(lock: Lockfile, name: string, entry: LockedSkill): Lockfile {
  const existing = lock.skills[name];
  lock.generated = new Date().toISOString();
  lock.skills[name] = existing
    ? { ...existing, ...entry, agents: [...new Set([...existing.agents, ...entry.agents])] }
    : entry;
  return lock;
}
export function removeLock(lock: Lockfile, name: string): boolean { const existed = Boolean(lock.skills[name]); delete lock.skills[name]; lock.generated = new Date().toISOString(); return existed; }
export function removeLockAgent(lock: Lockfile, name: string, agent: string): boolean {
  const entry = lock.skills[name]; if (!entry) return false;
  entry.agents = entry.agents.filter((id) => id !== agent); if (!entry.agents.length) delete lock.skills[name]; lock.generated = new Date().toISOString(); return true;
}
export function hasLockfile(projectDir: string): boolean { return existsSync(assertLockfilePath(projectDir)); }
