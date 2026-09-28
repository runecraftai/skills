#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { detectStack } from "./detect.js";
import { installSkills, removeSkill, skillHash } from "./install.js";
import { readRegistry, findSkill } from "./registry.js";
import { hasSurvivingCopy, readLockfile, removeScopeOwnership, tuiOwnershipKey, tuiScopeKeys, updateLock, verifyOwnedRecord, writeLockfile, type LockedSkill } from "./lockfile.js";
import { isTargetId, resolveSkillsDir, TARGETS, type TargetId } from "./targets.js";
import { mkdtemp, rename, rm } from "node:fs/promises";
import { rankSkills } from "../../core/src/index.js";
import { downloadSkill, loadRemoteCatalog } from "./remote-catalog.js";

const packageRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const catalogDir = existsSync(join(packageRoot, "skills")) ? join(packageRoot, "skills") : resolve(packageRoot, "../../skills/skills");
const usage = `grimoire — full-screen catalog and installer\n\nRuntime: Node >=26.4.0 with FFI, or Bun >=1.3.0. The interactive TUI requires stdin and stdout TTYs.\n\nUsage:\n  grimoire                         full-screen local catalog (default)\n  grimoire install -s <skill> -t <agent>   local catalog install\n  grimoire install <id> --target <agent>   remote catalog install\n  grimoire list|search [query]     browse the catalog\n  grimoire list --available        list remote catalog skills\n  grimoire list --installed        list lock-tracked installs\n  grimoire remove <id> --target <agent>   remove an installed skill\n  grimoire update [id|--all]       update lock-tracked installs\n  grimoire audit [--json]          verify installed files against lock\n  grimoire detect                  recommend skills for this project\n  grimoire status                  show project lockfile\n\nAgents: ${TARGETS.map((t) => t.id).join(", ")}\nOptions: --global --target-dir <dir> --overwrite --force --offline --help --version`;
function value(args: string[], flag: string): string | undefined { const i = args.indexOf(flag); return i < 0 ? undefined : args[i + 1]; }
function print(skills: ReturnType<typeof readRegistry>, query = "") { for (const s of skills.filter((s) => !query || `${s.name} ${s.description} ${s.category}`.toLowerCase().includes(query.toLowerCase()))) console.log(`${s.name} [${s.category}] — ${s.description.split("\n")[0]}`); }
function version() { try { return JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")).version; } catch { return "0.0.0"; } }
function scopeRemovalDir(entry: LockedSkill | undefined, target: TargetId, scope: "project" | "global", projectDir: string): string {
  const record = entry?.tuiTargets?.[tuiOwnershipKey(target, scope)];
  if (record) return resolve(record.destination, "..");
  if (scope === "project" && !tuiScopeKeys(entry, target).length && entry?.targets?.[target]) return resolve(entry.targets[target], "..");
  return resolveSkillsDir(target, { home: homedir(), projectDir, global: scope === "global" });
}
function uncoveredLegacyTargets(entry: LockedSkill): string[] {
  const destinations = new Set(Object.values(entry.tuiTargets ?? {}).map((record) => resolve(record.destination)));
  const legacy = new Set(entry.legacyAgents ?? []);
  return [...new Set([...Object.keys(entry.targets ?? {}), ...entry.agents])].filter((key) => {
    const location = entry.targets?.[key];
    return legacy.has(key) || (location === undefined ? tuiScopeKeys(entry, key).length === 0 : !destinations.has(resolve(location)));
  });
}
function removeCommand(args: string[], global: boolean): void {
  const id = args.find((a) => !a.startsWith("-") && a !== "remove"); if (!id) throw new Error("remove requires a skill id");
  const projectDir = resolve(process.cwd()), lock = readLockfile(projectDir), entry = lock.skills[id], target = value(args, "--target");
  if (!entry && !args.includes("--force")) throw new Error("refusing to remove an unmanaged skill without --force");
  const targets = (target ? [target] : entry?.agents ?? []).map((candidate) => { if (!isTargetId(candidate)) throw new Error(`unknown target: ${candidate}`); return candidate; });
  if (!targets.length) throw new Error("specify --target for --force removal");
  const scope = global ? "global" as const : "project" as const;
  if (!args.includes("--force") && targets.some((t) => !entry?.tuiTargets?.[tuiOwnershipKey(t, scope)])) throw new Error(`refusing to remove ${id} from ${scope} scope without verified ownership; pass --force`);
  const removals = targets.map((t) => {
    const dir = scopeRemovalDir(entry, t, scope, projectDir), removedPath = resolve(dir, id), copyRemoved = removeSkill(id, dir);
    const scopeDefaults = (["project", "global"] as const).map((candidate) => resolveSkillsDir(t, { home: homedir(), projectDir, global: candidate === "global" }));
    return { t, removal: { removedPath, copyRemoved, survivingCopy: hasSurvivingCopy(entry, t, removedPath, id, scopeDefaults) } };
  });
  if (entry) {
    for (const { t, removal } of removals) removeScopeOwnership(lock, id, t, scope, removal);
    writeLockfile(projectDir, lock);
  }
}
async function launchTui(global: boolean): Promise<number> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) { console.error("grimoire: interactive terminal required (stdin and stdout must both be TTYs)"); return 1; }
  if ((process.stdout.columns ?? 80) < 40 || (process.stdout.rows ?? 24) < 12) { console.error("grimoire: terminal too small for the interactive catalog (minimum 40x12)"); return 1; }
  if (process.versions.bun) {
    const [major, minor] = process.versions.bun.split(".").map(Number);
    if (major < 1 || (major === 1 && minor < 3)) { console.error("grimoire: interactive TUI requires Bun >=1.3.0 or Node >=26.4.0 with FFI"); return 1; }
  } else {
    const [major, minor] = process.versions.node.split(".").map(Number);
    if (major < 26 || (major === 26 && minor < 4)) { console.error("grimoire: interactive TUI requires Node >=26.4.0 with FFI or Bun >=1.3.0"); return 1; }
    if (!process.execArgv.includes("--experimental-ffi") && process.env.GRIMOIRE_FFI_REEXEC !== "1") {
      const child = spawnSync(process.execPath, ["--experimental-ffi", fileURLToPath(import.meta.url), ...(global ? ["--global"] : [])], { stdio: "inherit", env: { ...process.env, GRIMOIRE_FFI_REEXEC: "1" } });
      if (child.error) { console.error(`grimoire: unable to start Node with --experimental-ffi (${child.error.message})`); return 1; }
      return child.status ?? 1;
    }
    if (!process.execArgv.includes("--experimental-ffi")) { console.error("grimoire: OpenTUI FFI launcher did not enable --experimental-ffi"); return 1; }
  }
  try { const { runTui } = await import("./tui.js"); return await runTui({ catalogDir, home: homedir(), projectDir: resolve(process.cwd()), global }); }
  catch (error) { console.error(`grimoire: OpenTUI could not load (${error instanceof Error ? error.message : String(error)}); install optional platform dependencies and use Node >=26.4.0 with FFI or Bun >=1.3.0`); return 1; }
}
async function main() {
  const raw = process.argv.slice(2); const global = raw.includes("--global"); const args = raw.filter((a) => a !== "--global"); if (!args.length) return launchTui(global);
  if (args.includes("--help") || args.includes("-h") || args.includes("--version")) {
    if (args.includes("--version") && !args.includes("--help") && args.length === 1) { console.log(version()); return 0; }
    console.log(usage); return 0;
  }

  const command = args[0];
  if (command === "list" || command === "search" || command === "install" || command === "update" || command === "audit" || command === "remove") {
    const local = readRegistry(catalogDir);
    let remote;
    try { remote = await loadRemoteCatalog({ cacheFile: join(process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache"), "runecraft", "grimoire", "registry.json"), offline: args.includes("--offline") }); }
    catch (error) { if (args.includes("--offline") || command === "update" || (command === "install" && !args.includes("-s") && !args.includes("--skill")) || (command === "remove" && !args.includes("--force"))) throw error; }
    if (remote) {
      if (remote.warning) console.error(remote.warning);
      const skills = remote.registry.skills;
      if (command === "search") { const ranked = rankSkills(args.slice(1).filter((a) => !a.startsWith("--")).join(" "), skills); for (const r of ranked) console.log(`${r.skill.id} [${r.skill.category}] — ${r.skill.description}`); return 0; }
      if (command === "list" && args.includes("--available")) { for (const s of skills) console.log(`${s.id} [${s.category}] — ${s.description}`); return 0; }
      if (command === "list" && args.includes("--installed")) { const lock = readLockfile(resolve(process.cwd())); for (const [id, entry] of Object.entries(lock.skills)) console.log(`${id} [${entry.agents.join(", ")}] ${entry.version}`); return 0; }
      if (command === "remove") { removeCommand(args, global); return 0; }
      if (command === "audit") {
        const lock = readLockfile(resolve(process.cwd())), issues: string[] = [], unknown: string[] = [];
        for (const [id, entry] of Object.entries(lock.skills)) {
          const owned = entry.tuiTargets ?? {};
          for (const [key, record] of Object.entries(owned)) {
            const { modified, missing } = verifyOwnedRecord(record);
            for (const path of modified) issues.push(`${id}/${path}: tampered (${key})`);
            for (const path of missing) issues.push(`${id}/${path}: missing (${key})`);
          }
          // Legacy records lack scope-specific ownership, so their bytes cannot be
          // verified safely against a potentially different catalog revision.
          for (const target of uncoveredLegacyTargets(entry)) {
            // Keep the legacy copy as ownership-unknown rather than calling it tampered.
            unknown.push(`${id}/${target}: ownership unknown`);
          }
        }
        if (args.includes("--json")) console.log(JSON.stringify({ issues, ownershipUnknown: unknown, revision: remote.registry.revision }, null, 2)); else { console.log(issues.length ? issues.join("\\n") : "No tracked install issues found."); for (const line of unknown) console.log(line); } return issues.length ? 1 : 0;
      }
      if (command === "update") throw new Error("update requires an explicit supported version selection; no tracked install changed");
      if (command === "install" && !args.includes("-s") && !args.includes("--skill")) {
        const id = args.find((a) => !a.startsWith("-") && a !== "install"); const selected = skills.find((s) => s.id === id); if (!selected) throw new Error(`unknown skill: ${id ?? "(missing id)"}`);
        if (args.includes("--version") && selected.version !== value(args, "--version")) throw new Error(`requested version not available: ${value(args, "--version")}`);
        const target = value(args, "--target") ?? "pi"; if (!isTargetId(target)) throw new Error(`unknown target: ${target}`);
        const projectDir = resolve(process.cwd()); const targetDir = resolveSkillsDir(target, { home: homedir(), projectDir, global });
        const scratch = await mkdtemp(join(tmpdir(), "grimoire-remote-")); try {
          const staged = await downloadSkill(selected, process.env.GRIMOIRE_CATALOG_URL ?? "https://cdn.jsdelivr.net/gh/runecraftai/skills@stable/packages/skills/catalog/v1/registry.json");
          await rename(staged, join(scratch, selected.id));
          const result = installSkills({ catalogDir: scratch, targetDir, names: [selected.id], overwrite: args.includes("--overwrite") });
          if (result.failed.length) throw new Error(result.failed[0].error);
          if (!global) { const lock = readLockfile(projectDir); lock.catalogUrl = process.env.GRIMOIRE_CATALOG_URL ?? "https://cdn.jsdelivr.net/gh/runecraftai/skills@stable/packages/skills/catalog/v1/registry.json"; lock.revision = remote.registry.revision; updateLock(lock, selected.id, { version: selected.version, hash: selected.contentSha256, contentSha256: selected.contentSha256, fileHashes: Object.fromEntries(selected.files.map((f) => [f.path, f.sha256])), installed: new Date().toISOString(), agents: [...new Set([...(lock.skills[selected.id]?.agents ?? []), target])], targets: { ...(lock.skills[selected.id]?.targets ?? {}), [target]: `${targetDir}/${selected.id}` }, license: selected.license, attribution: selected.attribution }); writeLockfile(projectDir, lock); }
          console.log(`${result.installed.length ? "installed" : result.overwritten.length ? "updated" : "already installed"}: ${selected.id}`); return 0;
        } finally { await rm(scratch, { recursive: true, force: true }); }
      }
    }
    if (command === "list" || command === "search") { print(local, command === "search" ? args.slice(1).join(" ") : ""); return 0; }
    if (command === "remove" && args.includes("--force")) { removeCommand(args, global); return 0; }
    if (["update", "audit", "remove"].includes(command)) throw new Error(`${command} requires a lock-tracked remote install; command not yet available for this catalog mode`);
  }
  const registry = readRegistry(catalogDir);
  if (command === "detect") { const d = detectStack(resolve(process.cwd()), registry); console.log(`Detected: ${d.stack.join(", ") || "no known stack"}`); for (const r of d.recommendations) console.log(`  ${r.name} — ${r.reason}`); return 0; }
  if (command === "status") {
    const lock = readLockfile(resolve(process.cwd()));
    const entries = Object.entries(lock.skills);
    if (!entries.length) { console.log("No tracked project installations."); return 0; }
    for (const [name, entry] of entries) {
      console.log(`${name} [${entry.agents.join(", ")}] ${entry.hash}`);
      for (const key of uncoveredLegacyTargets(entry)) console.log(`  ${key} ownership unknown`);
      for (const [key, record] of Object.entries(entry.tuiTargets ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
        const { modified, missing } = verifyOwnedRecord(record);
        const parts = [...(missing.length ? [`missing: ${missing.join(", ")}`] : []), ...(modified.length ? [`modified: ${modified.join(", ")}`] : [])];
        console.log(`  ${key} ${parts.length ? parts.join(" ") : "verified"}`);
      }
    }
    return 0;
  }
  if (command !== "install") throw new Error(`unknown command: ${command}`);
  const names = args.flatMap((a, i) => a === "-s" || a === "--skill" ? [args[i + 1]] : []).filter(Boolean) as string[];
  const target = value(args, "-t") ?? value(args, "--target");
  if (!names.length || !target || !isTargetId(target)) throw new Error(`noninteractive install requires --skill and --target (${TARGETS.map((t) => t.id).join(", ")})`);
  const unknown = names.filter((n) => !findSkill(catalogDir, n)); if (unknown.length) throw new Error(`unknown skill(s): ${unknown.join(", ")}`);
  const projectDir = resolve(process.cwd());
  const dir = value(args, "--target-dir") ?? resolveSkillsDir(target, { home: homedir(), projectDir, global });
  const result = installSkills({ catalogDir, targetDir: resolve(dir), names, overwrite: args.includes("--overwrite") });
  if (!global) {
    const lock = readLockfile(projectDir);
    for (const name of [...result.installed, ...result.overwritten]) {
      const skill = findSkill(catalogDir, name);
      if (skill) updateLock(lock, name, { version: skill.version, hash: skillHash(skill.dir), installed: new Date().toISOString(), agents: [target], targets: { ...(lock.skills[name]?.targets ?? {}), [target]: `${resolve(dir)}/${name}` } });
    }
    if (result.installed.length || result.overwritten.length) writeLockfile(projectDir, lock);
  }
  if (result.installed.length) console.log(`installed: ${result.installed.join(", ")}`); if (result.overwritten.length) console.log(`overwritten: ${result.overwritten.join(", ")}`); if (result.skipped.length) console.log(`already installed, skipped: ${result.skipped.join(", ")}`); if (result.failed.length) throw new Error(result.failed.map((f) => `${f.name}: ${f.error}`).join("; ")); return 0;
}
main().then((code) => { process.exitCode = code; }).catch((error) => { console.error(`Error: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });
