import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tag = process.env.CATALOG_TAG;
if (!tag || !/^catalog-v\d+\.\d+\.\d+$/.test(tag)) throw new Error("CATALOG_TAG must be catalog-vX.Y.Z");
const base = `https://cdn.jsdelivr.net/gh/runecraftai/skills@${tag}/packages/skills/catalog/v1`;
const artifact = process.env.CATALOG_ARTIFACT_DIR ?? join(root, "release-artifact/catalog/v1");
const registryBytes = await readFile(join(artifact, "registry.json"));
const registry = JSON.parse(registryBytes.toString("utf8"));
const MAX_ATTEMPTS = 3;
const check = async (path: string, expected: Uint8Array): Promise<void> => {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(`${base}/${path}`, { redirect: "error", signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`CDN fetch failed for ${path}: HTTP ${response.status}`);
      const actual = new Uint8Array(await response.arrayBuffer());
      if (Buffer.compare(Buffer.from(actual), Buffer.from(expected)) !== 0) throw new Error(`Published bytes differ: ${path}`);
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  throw lastError!;
};
await check("registry.json", registryBytes);
for (const skill of registry.skills) for (const file of skill.files) {
  const path = `skills/${skill.id}/${file.path}`;
  const bytes = await readFile(join(artifact, "skills", skill.id, ...file.path.split("/")));
  if (bytes.byteLength !== file.size || createHash("sha256").update(bytes).digest("hex") !== file.sha256) throw new Error(`Built artifact digest mismatch: ${path}`);
  await check(path, bytes);
}
console.log(`Verified CDN registry and ${registry.skills.reduce((n: number, s: any) => n + s.files.length, 0)} content files for ${tag}`);
