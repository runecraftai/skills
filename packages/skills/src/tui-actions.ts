import { lstatSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { installSkills } from "./install.js";
import { readLockfile, writeLockfile } from "./lockfile.js";
import { loadTuiSnapshot, readTreeManifest, type TuiContext } from "./tui-model.js";

export interface ActionResult { succeeded: Array<{ id: string; destination: string }>; failed: Array<{ id: string; destination: string; reason: string }>; }
function fail(result: ActionResult, id: string, destination: string, reason: string) { result.failed.push({ id, destination, reason }); }
function sameManifest(left: Record<string, string>, right: Record<string, string>): boolean {
  const a = Object.keys(left).sort(), b = Object.keys(right).sort();
  return a.length === b.length && a.every((key, index) => key === b[index] && left[key] === right[key]);
}
export function applyTuiBatch(ctx: TuiContext, ids: string[], action: "install" | "remove", confirm = false): ActionResult {
  const result: ActionResult = { succeeded: [], failed: [] };
  if (!confirm) return result;
  for (const id of ids) {
    const before = loadTuiSnapshot(ctx), skill = before.skills.find((item) => item.id === id), status = before.statuses[id];
    if (!skill || !status) { fail(result, id, before.destination, "skill ID is no longer in the catalog"); continue; }
    if (before.lockError) { fail(result, id, status.destination, `lockfile error: ${before.lockError}`); continue; }
    if (action === "install") {
      if (status.status !== "absent") { fail(result, id, status.destination, `install requires absent status; found ${status.status}`); continue; }
      const install = installSkills({ catalogDir: ctx.catalogDir, targetDir: before.destination, names: [id.split("/").at(-1)!] });
      if (install.failed.length || install.skipped.length) { fail(result, id, status.destination, install.failed[0]?.error ?? "destination appeared before install"); continue; }
      const actual = readTreeManifest(status.destination);
      if (!sameManifest(actual, skill.manifest)) { fail(result, id, status.destination, "installed bytes differ from the catalog; left in place as unmanaged"); continue; }
      try {
        const lock = readLockfile(ctx.projectDir);
        const key = id.split("/").at(-1)!;
        const entry = lock.skills[key] ?? { version: skill.version, hash: "", installed: new Date().toISOString(), agents: [] };
        const source = loadTuiSnapshot(ctx).skills.find((item) => item.id === id);
        if (!source || !Object.keys(source.manifest).length) throw new Error("catalog entry changed or could not be verified during installation");
        const files = source.manifest;
        (entry as typeof entry & { tuiTargets?: Record<string, unknown> }).tuiTargets ??= {};
        (entry as typeof entry & { tuiTargets: Record<string, unknown> }).tuiTargets[before.target] = { destination: resolve(status.destination), scope: before.scope, files, identity: id };
        entry.agents = [...new Set([...entry.agents, before.target])]; lock.skills[key] = entry; writeLockfile(ctx.projectDir, lock);
        result.succeeded.push({ id, destination: status.destination });
      } catch (error) { fail(result, id, status.destination, `installed but lock update failed: ${error instanceof Error ? error.message : String(error)}`); }
      continue;
    }
    if (status.status !== "managed-clean") { fail(result, id, status.destination, `remove requires managed-clean status; found ${status.status}`); continue; }
    const again = loadTuiSnapshot(ctx).statuses[id];
    if (again?.status !== "managed-clean" || again.destination !== status.destination) { fail(result, id, status.destination, "destination changed during confirmation"); continue; }
    try {
      if (lstatSync(status.destination).isSymbolicLink()) throw new Error("destination became a symlink");
      rmSync(status.destination, { recursive: true, force: false });
      const lock = readLockfile(ctx.projectDir), key = id.split("/").at(-1)!, entry = lock.skills[key] as (typeof lock.skills[string] & { tuiTargets?: Record<string, unknown> }) | undefined;
      if (entry?.tuiTargets) { delete entry.tuiTargets[before.target]; if (!Object.keys(entry.tuiTargets).length) delete (entry as typeof entry & { tuiTargets?: unknown }).tuiTargets; }
      if (entry && !entry.targets?.[before.target]) { entry.agents = entry.agents.filter((target) => target !== before.target); if (!entry.agents.length && !entry.tuiTargets) delete lock.skills[key]; }
      writeLockfile(ctx.projectDir, lock); result.succeeded.push({ id, destination: status.destination });
    } catch (error) { fail(result, id, status.destination, error instanceof Error ? error.message : String(error)); }
  }
  return result;
}
