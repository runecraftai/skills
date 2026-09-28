import { rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { assertNoSymlinks, installSkills } from "./install.js";
import { readLockfile, removeScopeOwnership, tuiOwnershipKey, writeLockfile, type LockedSkill } from "./lockfile.js";
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
      let phase: "install" | "verify" | "lock" = "install";
      try {
        const install = installSkills({ catalogDir: ctx.catalogDir, targetDir: before.destination, names: [id.split("/").at(-1)!] });
        if (install.failed.length || install.skipped.length) { fail(result, id, status.destination, install.failed[0]?.error ?? "destination appeared before install"); continue; }
        phase = "verify";
        const actual = readTreeManifest(status.destination);
        if (!sameManifest(actual, skill.manifest)) { fail(result, id, status.destination, "installed bytes differ from the catalog; left in place as unmanaged"); continue; }
        if (!Object.keys(actual).length) throw new Error("installed bytes could not be verified against the catalog");
        phase = "lock";
        const lock = readLockfile(ctx.projectDir);
        const key = id.split("/").at(-1)!;
        const entry: LockedSkill = lock.skills[key] ?? { version: skill.version, hash: "", installed: new Date().toISOString(), agents: [] };
        const files = actual;
        entry.tuiTargets ??= {};
        entry.tuiTargets[tuiOwnershipKey(before.target, before.scope)] = { destination: resolve(status.destination), scope: before.scope, files, identity: id };
        entry.agents = [...new Set([...entry.agents, before.target])];
        lock.skills[key] = entry; writeLockfile(ctx.projectDir, lock);
        result.succeeded.push({ id, destination: status.destination });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        fail(result, id, status.destination, phase === "install" ? message : phase === "verify" ? `installed but verification failed: ${message}` : `installed but lock update failed: ${message}`);
      }
      continue;
    }
    if (status.status !== "managed-clean") { fail(result, id, status.destination, `remove requires managed-clean status; found ${status.status}`); continue; }
    const again = loadTuiSnapshot(ctx).statuses[id];
    if (again?.status !== "managed-clean" || again.destination !== status.destination) { fail(result, id, status.destination, "destination changed during confirmation"); continue; }
    try {
      assertNoSymlinks(status.destination);
      rmSync(status.destination, { recursive: true, force: false });
    } catch (error) { fail(result, id, status.destination, error instanceof Error ? error.message : String(error)); continue; }
    try {
      const lock = readLockfile(ctx.projectDir), key = id.split("/").at(-1)!;
      removeScopeOwnership(lock, key, before.target, before.scope);
      writeLockfile(ctx.projectDir, lock); result.succeeded.push({ id, destination: status.destination });
    } catch (error) { fail(result, id, status.destination, `removed but lock update failed: ${error instanceof Error ? error.message : String(error)}`); }
  }
  return result;
}
