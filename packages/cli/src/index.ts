#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { agentPath, AGENTS, getAgent, type Agent } from "./agents.js";
import { detectStack } from "./detect.js";
import { installedSkillNames, installSkill, removeSkill, skillHash } from "./install.js";
import { readLockfile, removeLockAgent, updateLock, writeLockfile } from "./lockfile.js";
import { findSkill, readRegistry, type RegistrySkill } from "./registry.js";

const projectDir = resolve(process.cwd());
const moduleDir = dirname(fileURLToPath(import.meta.url));
const catalogDir = existsSync(join(moduleDir, "../catalog"))
  ? resolve(moduleDir, "../catalog")
  : resolve(moduleDir, "../../skills/skills");
const usage = `grimoire — install Runecraft skills\n\nUsage:\n  grimoire                         interactive wizard\n  grimoire install [skills...]    install detected or named skills\n  grimoire list|search <query>    browse the catalog\n  grimoire status                 show installed skills\n  grimoire update [skill]         update installed skills\n  grimoire remove <skill>         remove a skill\n  grimoire info <skill>           show skill details\n\nOptions: --agent <id[,id...]>  --global  --overwrite  --help`;
interface Options { agents: string[]; agentsSpecified: boolean; global: boolean; overwrite: boolean; }
function options(args: string[]): { positional: string[]; opts: Options } {
  const positional: string[] = []; const opts: Options = { agents: ["pi"], agentsSpecified: false, global: false, overwrite: false };
  for (let i = 0; i < args.length; i++) { const arg = args[i];
    if (arg === "--global") opts.global = true;
    else if (arg === "--overwrite") opts.overwrite = true;
    else if (arg === "--agent") { opts.agents = (args[++i] ?? "").split(",").filter(Boolean); opts.agentsSpecified = true; }
    else if (arg.startsWith("--agent=")) { opts.agents = arg.slice(8).split(",").filter(Boolean); opts.agentsSpecified = true; }
    else if (arg === "--help" || arg === "-h") positional.push("--help");
    else positional.push(arg);
  } return { positional, opts };
}
function fail(message: string): never { throw new Error(message); }
function validAgents(ids: string[]): Agent[] { const result = ids.map((id) => getAgent(id)); if (result.some((a) => !a)) fail(`unknown agent (choose: ${AGENTS.map((a) => a.id).join(", ")})`); return result as Agent[]; }
function selectedSkills(names: string[], detected: string[] = []): RegistrySkill[] {
  const wanted = names.length ? names : detected; if (!wanted.length) fail("no skills specified and no stack recommendations found");
  return wanted.map((name) => findSkill(catalogDir, name) ?? fail(`skill not found: ${name}`));
}
function install(names: string[], opts: Options, detected: string[] = []): void {
  const available = new Set(readRegistry(catalogDir).map((skill) => skill.name));
  const unavailableDetected = detected.filter((name) => !available.has(name));
  const availableDetected = detected.filter((name) => available.has(name));
  if (!names.length && unavailableDetected.length) {
    console.warn(`Detected skills unavailable: ${unavailableDetected.join(", ")}`);
  }
  if (!names.length && detected.length && !availableDetected.length) {
    fail(`detected skills unavailable: ${unavailableDetected.join(", ")}`);
  }
  const skills = selectedSkills(names, availableDetected); const agents = validAgents(opts.agents); const lock = readLockfile(projectDir);
  for (const skill of skills) for (const agent of agents) { const target = agentPath(agent, projectDir, opts.global); const result = installSkill(skill, target, opts.overwrite); console.log(`${result}: ${skill.name} → ${target}`); if (!opts.global) updateLock(lock, skill.name, { version: skill.version, hash: skillHash(skill.dir), installed: new Date().toISOString(), agents: agents.map((a) => a.id) }); }
  if (!opts.global) writeLockfile(projectDir, lock);
}
async function wizard(): Promise<void> { const registry = readRegistry(catalogDir); console.log("Runecraft skills:\n" + registry.map((s) => `  ${s.name} — ${s.description.split("\n")[0]}`).join("\n")); const rl = readline.createInterface({ input: stdin, output: stdout }); const answer = await rl.question("\nSkills (comma-separated, empty = detect): "); const agent = await rl.question(`Agent (${AGENTS.map((a) => a.id).join(", ")}, default pi): `); rl.close(); const detected = detectStack(projectDir); console.log(detected.stack.length ? `Detected: ${detected.stack.join(", ")}` : "No stack detected"); install(answer ? answer.split(",").map((s) => s.trim()) : [], { agents: [agent || "pi"], agentsSpecified: true, global: false, overwrite: false }, detected.skills); }
function list(query?: string): void { for (const skill of readRegistry(catalogDir).filter((s) => !query || `${s.name} ${s.description}`.toLowerCase().includes(query.toLowerCase()))) console.log(`${skill.name}@${skill.version} — ${skill.description.split("\n")[0]}`); }
function status(): void { const lock = readLockfile(projectDir); const names = Object.keys(lock.skills); if (!names.length) return console.log("No skills installed in this project."); for (const name of names) console.log(`${name}@${lock.skills[name].version} ${lock.skills[name].hash} [${lock.skills[name].agents.join(", ")}]`); }
function info(name: string): void { const skill = findSkill(catalogDir, name) ?? fail(`skill not found: ${name}`); console.log(`${skill.name}@${skill.version}\n${skill.description}\npath: ${skill.dir}`); }
async function main(): Promise<void> { const raw = process.argv.slice(2); if (!raw.length) return wizard(); const command = raw[0]; if (command === "--help" || command === "-h") return console.log(usage); const { positional, opts } = options(raw.slice(1)); if (positional.includes("--help")) return console.log(usage);
  if (command === "list") return list(); if (command === "search") return list(positional[0]); if (command === "status") return status(); if (command === "info") return info(positional[0] ?? fail("info requires a skill"));
  if (command === "remove") { const name = positional[0] ?? fail("remove requires a skill"); const agents = validAgents(opts.agents); for (const agent of agents) console.log(removeSkill(name, agentPath(agent, projectDir, opts.global)) ? `removed: ${name} (${agent.id})` : `not installed: ${name} (${agent.id})`); if (!opts.global) { const lock = readLockfile(projectDir); for (const agent of agents) removeLockAgent(lock, name, agent.id); writeLockfile(projectDir, lock); } return; }
  if (command === "update") { const lock = readLockfile(projectDir); const names = positional.length ? positional : opts.global ? [...new Set(validAgents(opts.agents).flatMap((agent) => installedSkillNames(agentPath(agent, projectDir, true))).filter((name) => findSkill(catalogDir, name)))] : Object.keys(lock.skills); const agents = !opts.global && !opts.agentsSpecified ? [...new Set(Object.values(lock.skills).flatMap((skill) => skill.agents))] : opts.agents; return install(names, { ...opts, agents, overwrite: true }); }
  if (command === "install") { const detected = detectStack(projectDir); if (!positional.length && detected.skills.length) console.log(`Based on your stack (${detected.stack.join(", ")}), suggested: ${detected.skills.join(", ")}`); return install(positional, opts, detected.skills); }
  fail(`unknown command: ${command}`);
}
main().catch((error) => { console.error(`Error: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });
