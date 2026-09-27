import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";
import type { RegistrySkill } from "./registry.js";
import { readRegistry } from "./registry.js";
import { readLockfile, lockPath, type Lockfile } from "./lockfile.js";
import { resolveSkillsDir, TARGETS, type TargetId } from "./targets.js";

export type SkillStatus = "absent" | "managed-clean" | "managed-modified" | "existing-unmanaged/unknown" | "unreadable/error";
export interface TuiSkill extends RegistrySkill { id: string; files: string[]; manifest: Record<string, string>; content: string | null; tags: string[]; trigger?: string; contentError?: string; }
export interface TargetSkillStatus { status: SkillStatus; destination: string; scope: "project" | "global"; detail?: string; }
export interface TuiSnapshot { skills: TuiSkill[]; categories: Array<{ name: string; count: number }>; target: TargetId; destination: string; scope: "project" | "global"; statuses: Record<string, TargetSkillStatus>; lockError?: string; }
export interface TuiContext { catalogDir: string; home: string; projectDir: string; global: boolean; env?: Record<string, string | undefined>; target?: TargetId; }
interface OwnedRecord { destination: string; scope: "project" | "global"; files: Record<string, string>; identity: string; }

function sha256(path: string): string { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
export function readTreeManifest(dir: string): Record<string, string> {
  const result: Record<string, string> = {};
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name); const id = relative(dir, path).split(sep).join("/");
      if (entry.isSymbolicLink()) throw new Error(`symlink found: ${id}`);
      if (entry.isDirectory()) walk(path); else if (entry.isFile()) result[id] = sha256(path); else throw new Error(`unsupported file: ${id}`);
    }
  };
  walk(dir); return result;
}
function readStrictLock(projectDir: string): { lock?: Lockfile; error?: string } {
  const path = lockPath(projectDir);
  try {
    const file = lstatSync(path, { throwIfNoEntry: false });
    if (!file) return {};
    if (file.isSymbolicLink() || !statSync(path).isFile()) throw new Error("lockfile is not a regular file");
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (![1, 2].includes(parsed.version) || !parsed.skills || typeof parsed.skills !== "object" || Array.isArray(parsed.skills)) throw new Error("unsupported or malformed lockfile");
    for (const entry of Object.values(parsed.skills) as unknown[]) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry) || !Array.isArray((entry as { agents?: unknown }).agents)) throw new Error("malformed skill record in lockfile");
    }
    return { lock: readLockfile(projectDir) };
  } catch (error) { return { error: error instanceof Error ? error.message : String(error) }; }
}
export function loadTuiSnapshot(ctx: TuiContext): TuiSnapshot {
  const target = ctx.target ?? "pi", scope = ctx.global ? "global" : "project";
  const destination = resolve(resolveSkillsDir(target, { home: ctx.home, projectDir: ctx.projectDir, global: ctx.global, env: ctx.env }));
  const lockResult = readStrictLock(ctx.projectDir);
  const skills: TuiSkill[] = [];
  let registry: RegistrySkill[] = [];
  try { registry = readRegistry(ctx.catalogDir); } catch { /* per-entry reads below preserve the catalog rows */ }
  for (const skill of registry) {
    const id = relative(ctx.catalogDir, skill.dir).split(sep).join("/");
    let content: string | null = null, contentError: string | undefined, meta: Record<string, unknown> = {};
    try { content = readFileSync(join(skill.dir, "SKILL.md"), "utf8"); } catch (error) { contentError = error instanceof Error ? error.message : String(error); }
    try { meta = JSON.parse(readFileSync(join(skill.dir, ".skill-meta.json"), "utf8")); } catch {}
    let manifest: Record<string, string> = {};
    try { manifest = readTreeManifest(skill.dir); } catch { manifest = {}; }
    const files = Object.keys(manifest).filter((file) => file !== "SKILL.md" && file !== ".skill-meta.json").sort().map((file) => {
      try { return readFileSync(join(skill.dir, file)).toString("utf8").includes("\ufffd") ? `${file} [binary/non-UTF-8]` : file; } catch { return `${file} [unreadable]`; }
    });
    const trigger = meta.trigger;
    skills.push({ ...skill, id, files, manifest, content, contentError, tags: Array.isArray(meta.tags) ? meta.tags.filter((tag): tag is string => typeof tag === "string") : [], trigger: typeof trigger === "string" ? trigger : Array.isArray(trigger) ? trigger.filter((x): x is string => typeof x === "string").join(", ") : undefined });
  }
  const categories = [...new Set(skills.map((skill) => skill.category ?? "Other"))].sort().map((name) => ({ name, count: skills.filter((skill) => (skill.category ?? "Other") === name).length }));
  const statuses: Record<string, TargetSkillStatus> = {};
  for (const skill of skills) {
    const path = join(destination, skill.id.split("/").at(-1)!);
    try {
      const stat = lstatSync(path, { throwIfNoEntry: false });
      if (!stat) { statuses[skill.id] = { status: lockResult.error ? "unreadable/error" : "absent", destination: path, scope, detail: lockResult.error }; continue; }
      if (stat.isSymbolicLink() || !stat.isDirectory()) { statuses[skill.id] = { status: "existing-unmanaged/unknown", destination: path, scope, detail: "destination is not a regular directory" }; continue; }
      if (lockResult.error) { statuses[skill.id] = { status: "unreadable/error", destination: path, scope, detail: lockResult.error }; continue; }
      const entry = lockResult.lock?.skills[skill.id.split("/").at(-1)!] as (Lockfile["skills"][string] & { tuiTargets?: Partial<Record<TargetId, OwnedRecord>> }) | undefined;
      const owned = entry?.tuiTargets?.[target];
      if (!owned || resolve(owned.destination) !== path || owned.scope !== scope || owned.identity !== skill.id) { statuses[skill.id] = { status: "existing-unmanaged/unknown", destination: path, scope }; continue; }
      const actual = readTreeManifest(path), expected = owned.files;
      statuses[skill.id] = { status: Object.keys(actual).length === Object.keys(expected).length && Object.entries(expected).every(([file, hash]) => actual[file] === hash) ? "managed-clean" : "managed-modified", destination: path, scope };
    } catch (error) { statuses[skill.id] = { status: "unreadable/error", destination: path, scope, detail: error instanceof Error ? error.message : String(error) }; }
  }
  return { skills, categories, target, destination, scope, statuses, lockError: lockResult.error };
}
export function filterTuiSkills(skills: TuiSkill[], query: string): TuiSkill[] {
  const needle = query.trim().toLocaleLowerCase();
  return skills.filter((skill) => !needle || `${skill.name} ${skill.description} ${skill.category ?? "Other"} ${skill.tags.join(" ")}`.toLocaleLowerCase().includes(needle));
}
export function sanitizeText(text: string): string {
  return text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").replace(/\t/g, "  ").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "�");
}
export function previewText(text: string | null, error?: string): string {
  if (error) return `[Unable to read SKILL.md: ${error}]`;
  if (text === null) return "[SKILL.md unavailable]";
  return sanitizeText(text).slice(0, 200_000);
}
export function targetOptions(ctx: TuiContext) {
  return TARGETS.map((target) => ({ id: target.id, label: target.label, path: resolveSkillsDir(target.id, { home: ctx.home, projectDir: ctx.projectDir, global: ctx.global, env: ctx.env }), scope: ctx.global ? "global" as const : "project" as const }));
}
