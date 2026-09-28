import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function seedOfflineRegistry(root: string): void {
  const dir = join(root, "cache", "runecraft", "grimoire");
  mkdirSync(dir, { recursive: true });
  const registry = { schemaVersion: 1, catalogVersion: "1.0.0", revision: "rev-test", generatedAt: new Date().toISOString(), skills: [] };
  writeFileSync(join(dir, "registry.json"), JSON.stringify({ registry, checkedAt: Date.now() }));
}
