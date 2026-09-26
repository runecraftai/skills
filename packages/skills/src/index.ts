#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { detectStack } from "./detect.js";
import { installSkills, removeSkill, skillHash } from "./install.js";
import { readRegistry, findSkill } from "./registry.js";
import { readLockfile, updateLock, writeLockfile } from "./lockfile.js";
import { isTargetId, resolveSkillsDir, TARGETS } from "./targets.js";
import { runInteractive } from "./ui.js";
import { homedir as osHomedir } from "node:os";
import { mkdir, mkdtemp, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { rankSkills } from "../../core/src/index.js";
import { downloadSkill, loadRemoteCatalog } from "./remote-catalog.js";

const packageRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const catalogDir = existsSync(join(packageRoot, "skills")) ? join(packageRoot, "skills") : resolve(packageRoot, "../../skills/skills");
const usage = `grimoire — browse and install agent skills\n\nUsage:\n  grimoire                         interactive catalog (default)\n  grimoire install -s <skill> -t <agent>   noninteractive install\n  grimoire list|search [query]     browse the catalog\n  grimoire detect                  recommend skills for this project\n  grimoire status                  show project lockfile\n\nAgents: ${TARGETS.map((t) => t.id).join(", ")}\nOptions: --global --target-dir <dir> --overwrite --help --version`;
function value(args: string[], flag: string): string | undefined { const i = args.indexOf(flag); return i < 0 ? undefined : args[i + 1]; }
function print(skills: ReturnType<typeof readRegistry>, query = "") { for (const s of skills.filter((s) => !query || `${s.name} ${s.description} ${s.category}`.toLowerCase().includes(query.toLowerCase()))) console.log(`${s.name} [${s.category}] — ${s.description.split("\n")[0]}`); }
function version() { try { return JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")).version; } catch { return "0.0.0"; } }
async function main() {
  const args = process.argv.slice(2); if (!args.length || args[0] === "--global") return runInteractive({ catalogDir, home: homedir(), projectDir: resolve(process.cwd()), global: args.includes("--global") });
  if (args.includes("--help") || args.includes("-h")) { console.log(usage); return 0; }
  if (args.includes("--version")) { console.log(version()); return 0; }
  const command = args[0];
  if (command === "list" || command === "search" || command === "install" || command === "update" || command === "audit" || command === "remove") {
    const local = readRegistry(catalogDir);
    let remote;
    try { remote = await loadRemoteCatalog({ cacheFile: join(process.env.XDG_CACHE_HOME ?? join(osHomedir(), ".cache"), "runecraft", "grimoire", "registry.json"), offline: args.includes("--offline") }); }
    catch (error) { if (args.includes("--offline") || command === "update" || (command === "install" && !args.includes("-s") && !args.includes("--skill")) || (command === "remove" && !args.includes("--force"))) throw error; }
    if (remote) {
      if (remote.warning) console.error(remote.warning);
      const skills = remote.registry.skills;
      if (command === "search") { const ranked = rankSkills(args.slice(1).filter((a) => !a.startsWith("--")).join(" "), skills); for (const r of ranked) console.log(`${r.skill.id} [${r.skill.category}] — ${r.skill.description}`); return 0; }
      if (command === "list" && args.includes("--available")) { for (const s of skills) console.log(`${s.id} [${s.category}] — ${s.description}`); return 0; }
      if (command === "list" && args.includes("--installed")) { const lock = readLockfile(resolve(process.cwd())); for (const [id, entry] of Object.entries(lock.skills)) console.log(`${id} [${entry.agents.join(", ")}] ${entry.version}`); return 0; }
      if (command === "remove") {
        const id = args.find((a) => !a.startsWith("-") && a !== "remove"); if (!id) throw new Error("remove requires a skill id");
        const projectDir = resolve(process.cwd()), lock = readLockfile(projectDir), entry = lock.skills[id], target = value(args, "--target");
        if (!entry && !args.includes("--force")) throw new Error("refusing to remove an unmanaged skill without --force");
        const targets = target ? [target] : entry?.agents ?? []; if (!targets.length) throw new Error("specify --target for --force removal");
        for (const t of targets) { if (!isTargetId(t)) throw new Error(`unknown target: ${t}`); removeSkill(id, entry?.targets?.[t] ? resolve(entry.targets[t], "..") : resolveSkillsDir(t, { home: homedir(), projectDir, global: !entry })); }
        if (entry) { if (target) { entry.agents = entry.agents.filter((x) => x !== target); delete entry.targets?.[target]; if (!entry.agents.length) delete lock.skills[id]; } else delete lock.skills[id]; writeLockfile(projectDir, lock); } return 0;
      }
      if (command === "audit") {
        const lock = readLockfile(resolve(process.cwd())), issues: string[] = [];
        for (const [id, entry] of Object.entries(lock.skills)) for (const [target, location] of Object.entries(entry.targets ?? {})) for (const [path, expected] of Object.entries(entry.fileHashes ?? {})) {
          try { const actual = createHash("sha256").update(readFileSync(join(location, path))).digest("hex"); if (actual !== expected) issues.push(`${id}/${path}: tampered (${target})`); } catch { issues.push(`${id}/${path}: missing (${target})`); }
        }
        if (args.includes("--json")) console.log(JSON.stringify({ issues, revision: remote.registry.revision }, null, 2)); else console.log(issues.length ? issues.join("\\n") : "No tracked install issues found."); return issues.length ? 1 : 0;
      }
      if (command === "update") throw new Error("update requires an explicit supported version selection; no tracked install changed");
      if (command === "install" && !args.includes("-s") && !args.includes("--skill")) {
        const id = args.find((a) => !a.startsWith("-") && a !== "install"); const selected = skills.find((s) => s.id === id); if (!selected) throw new Error(`unknown skill: ${id ?? "(missing id)"}`);
        if (args.includes("--version") && selected.version !== value(args, "--version")) throw new Error(`requested version not available: ${value(args, "--version")}`);
        const target = value(args, "--target") ?? "pi"; if (!isTargetId(target)) throw new Error(`unknown target: ${target}`);
        const projectDir = resolve(process.cwd()), global = args.includes("--global"); const targetDir = resolveSkillsDir(target, { home: homedir(), projectDir, global });
        const scratch = await mkdtemp(join(tmpdir(), "grimoire-remote-")); try {
          const staged = await downloadSkill(selected, process.env.GRIMOIRE_CATALOG_URL ?? "https://cdn.jsdelivr.net/gh/runecraftai/skills@stable/packages/skills/catalog/v1/registry.json");
          await rename(staged, join(scratch, selected.id));
          const result = installSkills({ catalogDir: scratch, targetDir, names: [selected.id], overwrite: args.includes("--overwrite") });
          if (result.failed.length) throw new Error(result.failed[0].error);
          if (!global) { const lock = readLockfile(projectDir); lock.catalogUrl = process.env.GRIMOIRE_CATALOG_URL ?? "https://cdn.jsdelivr.net/gh/runecraftai/skills@stable/packages/skills/catalog/v1/registry.json"; lock.revision = remote.registry.revision; lock.skills[selected.id] = { version: selected.version, hash: selected.contentSha256, contentSha256: selected.contentSha256, fileHashes: Object.fromEntries(selected.files.map((f) => [f.path, f.sha256])), installed: new Date().toISOString(), agents: [...new Set([...(lock.skills[selected.id]?.agents ?? []), target])], targets: { ...(lock.skills[selected.id]?.targets ?? {}), [target]: `${targetDir}/${selected.id}` }, license: selected.license, attribution: selected.attribution }; writeLockfile(projectDir, lock); }
          console.log(`${result.installed.length ? "installed" : result.overwritten.length ? "updated" : "already installed"}: ${selected.id}`); return 0;
        } finally { await rm(scratch, { recursive: true, force: true }); }
      }
    }
    if (command === "list" || command === "search") { print(local, command === "search" ? args.slice(1).join(" ") : ""); return 0; }
    if (command === "remove" && args.includes("--force")) {
      const id = args.find((a) => !a.startsWith("-") && a !== "remove"); if (!id) throw new Error("remove requires a skill id");
      const projectDir = resolve(process.cwd()), lock = readLockfile(projectDir), entry = lock.skills[id], target = value(args, "--target");
      const targets = target ? [target] : entry?.agents ?? []; if (!targets.length) throw new Error("specify --target for --force removal");
      for (const t of targets) { if (!isTargetId(t)) throw new Error(`unknown target: ${t}`); removeSkill(id, entry?.targets?.[t] ? resolve(entry.targets[t], "..") : resolveSkillsDir(t, { home: homedir(), projectDir, global: !entry })); }
      if (entry) { if (target) { entry.agents = entry.agents.filter((x) => x !== target); delete entry.targets?.[target]; if (!entry.agents.length) delete lock.skills[id]; } else delete lock.skills[id]; writeLockfile(projectDir, lock); } return 0;
    }
    if (["update", "audit", "remove"].includes(command)) throw new Error(`${command} requires a lock-tracked remote install; command not yet available for this catalog mode`);
  }
  const registry = readRegistry(catalogDir);
  if (command === "detect") { const d = detectStack(resolve(process.cwd()), registry); console.log(`Detected: ${d.stack.join(", ") || "no known stack"}`); for (const r of d.recommendations) console.log(`  ${r.name} — ${r.reason}`); return 0; }
  if (command === "status") {
    const lock = readLockfile(resolve(process.cwd()));
    const entries = Object.entries(lock.skills);
    if (!entries.length) { console.log("No tracked project installations."); return 0; }
    for (const [name, entry] of entries) console.log(`${name} [${entry.agents.join(", ")}] ${entry.hash}`);
    return 0;
  }
  if (command !== "install") throw new Error(`unknown command: ${command}`);
  const names = args.flatMap((a, i) => a === "-s" || a === "--skill" ? [args[i + 1]] : []).filter(Boolean) as string[];
  const target = value(args, "-t") ?? value(args, "--target");
  if (!names.length || !target || !isTargetId(target)) throw new Error(`noninteractive install requires --skill and --target (${TARGETS.map((t) => t.id).join(", ")})`);
  const unknown = names.filter((n) => !findSkill(catalogDir, n)); if (unknown.length) throw new Error(`unknown skill(s): ${unknown.join(", ")}`);
  const global = args.includes("--global");
  const projectDir = resolve(process.cwd());
  const dir = value(args, "--target-dir") ?? resolveSkillsDir(target, { home: homedir(), projectDir, global });
  const result = installSkills({ catalogDir, targetDir: resolve(dir), names, overwrite: args.includes("--overwrite") });
  if (!global) {
    const lock = readLockfile(projectDir);
    for (const name of [...result.installed, ...result.overwritten]) {
      const skill = findSkill(catalogDir, name);
      if (skill) updateLock(lock, name, { version: skill.version, hash: skillHash(skill.dir), installed: new Date().toISOString(), agents: [target] });
    }
    if (result.installed.length || result.overwritten.length) writeLockfile(projectDir, lock);
  }
  if (result.installed.length) console.log(`installed: ${result.installed.join(", ")}`); if (result.overwritten.length) console.log(`overwritten: ${result.overwritten.join(", ")}`); if (result.skipped.length) console.log(`already installed, skipped: ${result.skipped.join(", ")}`); if (result.failed.length) throw new Error(result.failed.map((f) => `${f.name}: ${f.error}`).join("; ")); return 0;
}
main().then((code) => { process.exitCode = code; }).catch((error) => { console.error(`Error: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });
