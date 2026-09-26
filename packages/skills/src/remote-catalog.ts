import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fetchRegistry, type Registry, type Skill, validateRegistry, verifyFiles } from "../../core/src/index.js";

export const DEFAULT_CATALOG_URL = "https://cdn.jsdelivr.net/gh/runecraftai/skills@stable/packages/skills/catalog/v1/registry.json";
export interface RemoteCatalog { registry: Registry; freshness: "fresh" | "stale" | "offline"; warning?: string; }
export async function loadRemoteCatalog(options: { url?: string; cacheFile: string; offline?: boolean; fetcher?: typeof fetch }): Promise<RemoteCatalog> {
  const url = options.url ?? process.env.GRIMOIRE_CATALOG_URL ?? DEFAULT_CATALOG_URL;
  if (options.offline) {
    try { const cached = JSON.parse(await readFile(options.cacheFile, "utf8")); validateRegistry(cached.registry); return { registry: cached.registry, freshness: "offline", warning: "Offline: using a cached known revision; freshness is unknown." }; }
    catch { throw new Error("No validated cached catalog available for offline use"); }
  }
  const result = await fetchRegistry({ url, cacheFile: options.cacheFile, fetcher: options.fetcher });
  return { ...result };
}
export async function downloadSkill(skill: Skill, registryUrl: string, fetcher: typeof fetch = fetch): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "grimoire-skill-"));
  const base = new URL(".", registryUrl);
  try {
    for (const file of skill.files) {
      const url = new URL(`skills/${skill.id}/${file.path.split("/").map(encodeURIComponent).join("/")}`, base);
      if (url.origin !== base.origin) throw new Error("Catalog file URL escaped registry origin");
      const response = await fetcher(url, { redirect: "error" });
      if (!response.ok) throw new Error(`Skill file fetch failed: ${file.path} (${response.status})`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length !== file.size || createHash("sha256").update(bytes).digest("hex") !== file.sha256) throw new Error(`Digest mismatch: ${file.path}`);
      const path = join(root, ...file.path.split("/")); await mkdir(join(path, ".."), { recursive: true }); await writeFile(path, bytes, { flag: "wx", mode: 0o600 });
    }
    await verifyFiles(skill, root);
    return root;
  } catch (error) { await rm(root, { recursive: true, force: true }); throw error; }
}
