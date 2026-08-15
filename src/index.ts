#!/usr/bin/env node
/**
 * runecraft-skills — interactive installer TUI for the @runecraft/skills catalog.
 *
 *   runecraft-skills [install]             interactive installer (default command)
 *   runecraft-skills install --list        list the catalog
 *   runecraft-skills install -s <name> -t <id> [options]   scripting mode
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cyan, dim, green, red, yellow } from "picocolors";

import { installSkills } from "./install.js";
import { listSkills } from "./skills.js";
import { displayPath, isTargetId, resolveSkillsDir, TARGETS, type TargetId } from "./targets.js";
import { runInteractive } from "./ui.js";

const pkgRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const catalogDir = join(pkgRoot, "skills");

const USAGE = `runecraft-skills — install skills from the @runecraft/skills catalog

Usage:
  runecraft-skills [install]                    interactive installer (default command)
  runecraft-skills install --list               list available skills
  runecraft-skills install -s <name> -t <id>    install one or more skills (scripting)

Via npx or bunx (no install required):
  npx @runecraft/skills install
  bunx @runecraft/skills install

Options:
  -s, --skill <name>      skill to install (repeatable: -s a -s b)
  -t, --target <id>       install target: ${TARGETS.map((t) => t.id).join(", ")}
      --target-dir <dir>  override the destination skills directory
      --overwrite         replace already-installed skills (default: skip them)
  -l, --list              list the catalog skills and exit
  -h, --help              show this help
  -v, --version           print the package version

Examples:
  runecraft-skills
  npx @runecraft/skills install
  npx @runecraft/skills install --list
  npx @runecraft/skills install -s spec-driven -s test-driven-development -t pi
  npx @runecraft/skills install -s skill-forge -t opencode --overwrite
  npx @runecraft/skills install -s using-agent-skills -t codex --target-dir ./ci/skills`;

interface Args {
  skill: string[];
  target?: string;
  targetDir?: string;
  overwrite: boolean;
  list: boolean;
  help: boolean;
  version: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { skill: [], overwrite: false, list: false, help: false, version: false };
  const take = (flag: string, inline?: string): string => {
    if (inline !== undefined) return inline;
    const value = argv[++i];
    if (value === undefined) throw new Error(`missing value for ${flag}`);
    return value;
  };
  const noInlineValue = (flag: string, inline?: string): void => {
    if (inline !== undefined) throw new Error(`unexpected value for ${flag}`);
  };
  let i = 0;
  let sawInstall = false;
  for (; i < argv.length; i++) {
    const arg = argv[i];
    const eq = arg.startsWith("--") ? arg.indexOf("=") : -1;
    const flag = eq > 0 ? arg.slice(0, eq) : arg;
    const inline = eq > 0 ? arg.slice(eq + 1) : undefined;
    switch (flag) {
      case "-h":
      case "--help":
        noInlineValue(flag, inline);
        args.help = true;
        break;
      case "-v":
      case "--version":
        noInlineValue(flag, inline);
        args.version = true;
        break;
      case "-l":
      case "--list":
        noInlineValue(flag, inline);
        args.list = true;
        break;
      case "--overwrite":
        noInlineValue(flag, inline);
        args.overwrite = true;
        break;
      case "-s":
      case "--skill":
        args.skill.push(take(flag, inline));
        break;
      case "-t":
      case "--target":
        args.target = take(flag, inline);
        break;
      case "--target-dir":
        args.targetDir = take(flag, inline);
        break;
      default:
        // `install` is the default command; accept it as the first (only) positional.
        if (arg === "install" && !sawInstall) {
          sawInstall = true;
          break;
        }
        throw new Error(`unknown option: ${arg}`);
    }
  }
  return args;
}

function packageVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(pkgRoot, "package.json"), "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function printCatalog(): void {
  const skills = listSkills(catalogDir);
  if (skills.length === 0) {
    console.log(dim("(no skills found)"));
    return;
  }
  for (const skill of skills) {
    const version = skill.version ? dim(`@${skill.version}`) : "";
    const description = skill.description ? ` — ${skill.description}` : "";
    console.log(`  ${cyan(skill.name)}${version}${description}`);
  }
  console.log(dim(`\n${skills.length} skill(s) in ${catalogDir}`));
}

function fail(message: string): number {
  console.error(`${red("✖")} ${message}`);
  console.error(dim("Run `runecraft-skills --help` for usage."));
  return 1;
}

async function main(argv: string[]): Promise<number> {
  let args: Args;
  try {
    args = parseArgs(argv);
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }

  if (args.help) {
    console.log(USAGE);
    return 0;
  }
  if (args.version) {
    console.log(packageVersion());
    return 0;
  }
  if (args.list) {
    printCatalog();
    return 0;
  }

  const nonInteractive = args.skill.length > 0 || args.target !== undefined;

  if (!nonInteractive) {
    if (!process.stdout.isTTY || !process.stdin.isTTY) {
      return fail("interactive mode needs a terminal; run `bunx @runecraft/skills install -s <skill> -t <target>` (see `--list`) for scripting");
    }
    return runInteractive({ catalogDir, home: homedir(), targetDirOverride: args.targetDir, overwrite: args.overwrite });
  }

  if (args.skill.length === 0) return fail("--skill <name> is required in non-interactive mode");
  if (args.target === undefined) return fail("--target <id> is required in non-interactive mode");
  if (!isTargetId(args.target)) {
    return fail(`unknown target "${args.target}" (expected ${TARGETS.map((t) => t.id).join(", ")})`);
  }

  const available = new Set(listSkills(catalogDir).map((s) => s.name));
  const unknown = args.skill.filter((name) => !available.has(name));
  if (unknown.length > 0) {
    return fail(`unknown skill(s): ${unknown.join(", ")} — run "runecraft-skills --list" to see the catalog`);
  }

  const targetDir = args.targetDir !== undefined ? resolve(args.targetDir) : resolveSkillsDir(args.target as TargetId, { home: homedir() });
  const result = installSkills({ catalogDir, targetDir, names: args.skill, overwrite: args.overwrite });

  if (result.installed.length > 0) console.log(`${green("✔")} installed: ${result.installed.join(", ")}`);
  if (result.overwritten.length > 0) console.log(`${yellow("↻")} overwritten: ${result.overwritten.join(", ")}`);
  if (result.skipped.length > 0) console.log(`${dim("○")} already installed, skipped: ${result.skipped.join(", ")}`);
  for (const failure of result.failed) console.error(`${red("✖")} ${failure.name}: ${failure.error}`);
  console.log(dim(`target: ${displayPath(targetDir, homedir())}`));

  return result.failed.length > 0 ? 1 : 0;
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (err: unknown) => {
    console.error(`${red("✖")} unexpected error: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  },
);
