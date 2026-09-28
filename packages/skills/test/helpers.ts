import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function seedOfflineRegistry(root: string): void {
  const dir = join(root, "cache", "runecraft", "grimoire");
  mkdirSync(dir, { recursive: true });
  const registry = { schemaVersion: 1, catalogVersion: "1.0.0", revision: "rev-test", generatedAt: new Date().toISOString(), skills: [] };
  writeFileSync(join(dir, "registry.json"), JSON.stringify({ registry, checkedAt: Date.now() }));
}

export type LegacyEntry = { version: string; hash: string; installed: string; agents: string[] };

export function seedLegacyEntry<T extends Record<string, unknown>>(lockFile: string, extra?: T): LegacyEntry & T {
  const entry = { version: "1.0.0", hash: "sha256:legacy", installed: "2024-01-01T00:00:00.000Z", agents: ["pi"], ...(extra ?? {}) } as LegacyEntry & T;
  const lock = existsSync(lockFile)
    ? JSON.parse(readFileSync(lockFile, "utf8"))
    : { version: 2, generated: "2024-01-01T00:00:00.000Z", registry: "runecraftai/grimoire", catalogUrl: "", catalogId: "runecraftai/skills", revision: "legacy", skills: {} };
  lock.skills = { ...lock.skills, alpha: entry };
  writeFileSync(lockFile, JSON.stringify(lock, null, 2));
  return entry;
}
