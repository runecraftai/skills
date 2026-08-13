/**
 * Catalog listing: read the skill folders under skills/ (each a directory
 * containing SKILL.md) and surface name/description/version for the TUI.
 *
 * Metadata sources, in priority order:
 *   1. .skill-meta.json inside the skill folder (richest, when present)
 *   2. SKILL.md frontmatter (name / description / metadata.version)
 *   3. fallbacks: folder name, empty description
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

export interface CatalogSkill {
  name: string;
  dir: string;
  description: string;
  version?: string;
}

const META_FILE = ".skill-meta.json";

/** List every skill in the catalog directory (sorted by name). */
export function listSkills(catalogDir: string): CatalogSkill[] {
  let entries;
  try {
    entries = readdirSync(catalogDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const skills: CatalogSkill[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = join(catalogDir, entry.name);
    if (!existsSync(join(dir, "SKILL.md"))) continue;
    skills.push(readSkill(dir, entry.name));
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

/** Read a single skill folder's metadata. */
export function readSkill(dir: string, fallbackName?: string): CatalogSkill {
  let meta: { name?: string; description?: string; version?: string } | null = null;
  try {
    meta = JSON.parse(readFileSync(join(dir, META_FILE), "utf8"));
  } catch {
    // no/invalid .skill-meta.json — fall back to frontmatter
  }

  let front: { name?: string; description?: string; version?: string } = {};
  try {
    front = parseSkillFrontmatter(readFileSync(join(dir, "SKILL.md"), "utf8"));
  } catch {
    // unreadable SKILL.md — folder was validated to have one, but be safe
  }

  const name = meta?.name ?? front.name ?? fallbackName ?? basename(dir);
  const description = meta?.description ?? front.description ?? "";
  const version = meta?.version ?? front.version;
  return { name, dir, description, version };
}

/**
 * Minimal YAML frontmatter parser, scoped to the shapes used by this catalog:
 *  - `key: scalar`
 *  - `key: >` followed by indented folded lines
 *  - a nested `metadata:` map carrying `version:`
 */
export function parseSkillFrontmatter(raw: string): { name?: string; description?: string; version?: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!match) return {};

  const out: { name?: string; description?: string; version?: string } = {};
  let pending: "description" | "metadata" | null = null;
  const folded: string[] = [];

  const flush = () => {
    if (pending === "description" && folded.length) {
      out.description = folded.join(" ").replace(/\s+/g, " ").trim();
    }
    pending = null;
    folded.length = 0;
  };

  for (const line of match[1].split(/\r?\n/)) {
    if (/^\S/.test(line) && line.includes(":")) {
      flush();
      const idx = line.indexOf(":");
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (key === "name" && value) out.name = value;
      else if (key === "description" && /^[>|](?:-|\+)?$/.test(value)) pending = "description";
      else if (key === "description" && value) out.description = value;
      else if (key === "description") pending = "description";
      else if (key === "metadata") pending = "metadata";
    } else if (pending) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (pending === "description") folded.push(trimmed);
      else if (pending === "metadata") {
        const version = /^version:\s*(.+)$/.exec(trimmed);
        if (version) out.version = version[1].trim().replace(/^["']|["']$/g, "");
      }
    }
  }
  flush();
  return out;
}
