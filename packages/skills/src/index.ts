#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { detectStack } from "./detect.js";
import { installSkills, skillHash } from "./install.js";
import { readRegistry, findSkill } from "./registry.js";
import { readLockfile, updateLock, writeLockfile } from "./lockfile.js";
import { isTargetId, resolveSkillsDir, TARGETS } from "./targets.js";
import { runInteractive } from "./ui.js";

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
  const registry = readRegistry(catalogDir); const command = args[0];
  if (command === "list" || command === "search") { print(registry, command === "search" ? args[1] ?? "" : ""); return 0; }
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
