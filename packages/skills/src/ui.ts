import { cancel, intro, isCancel, log, multiselect, note, outro, select, spinner } from "@clack/prompts";
import { resolve } from "node:path";
import { findConflicts, installSkills, skillHash, type InstallResult } from "./install.js";
import { categories, findSkill, listSkills } from "./registry.js";
import { readLockfile, updateLock, writeLockfile } from "./lockfile.js";
import { displayPath, resolveSkillsDir, TARGETS, type TargetId } from "./targets.js";

export interface InteractiveContext { catalogDir: string; home: string; env?: Record<string, string | undefined>; targetDirOverride?: string; overwrite?: boolean; projectDir?: string; global?: boolean; }
const hint = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 90);
const cancelled = () => { cancel("Installation cancelled."); return 1; };
function report(result: InstallResult, target: string, home: string) { if (result.installed.length) log.success(`Installed: ${result.installed.join(", ")}`); if (result.overwritten.length) log.info(`Overwritten: ${result.overwritten.join(", ")}`); if (result.skipped.length) log.warn(`Skipped (already installed): ${result.skipped.join(", ")}`); for (const f of result.failed) log.error(`${f.name}: ${f.error}`); note(`Install target: ${displayPath(target, home)}`, "Done"); }

const BACK = "__back__";
const CONTINUE = "__continue__";

/** Browse categories while keeping one selection set across every category visit. */
export async function selectSkillsByCategory(grouped: ReturnType<typeof categories>): Promise<string[] | null> {
  const selected = new Set<string>();
  while (true) {
    const root = await select({ message: `Choose a category (${selected.size} selected)`, options: [
      ...grouped.map((c) => ({ value: c.name, label: c.name, hint: `${c.skills.length} skill(s), ${c.skills.filter((s) => selected.has(s.name)).length} selected` })),
      ...(selected.size ? [{ value: CONTINUE, label: "Continue with selected skills", hint: "Review and install" }] : []),
    ] });
    if (isCancel(root)) return null;
    if (root === CONTINUE) return [...selected];
    const category = grouped.find((c) => c.name === root);
    if (!category) continue;
    const picked = await multiselect({
      message: `${category.name} — select skills (space to toggle, enter to collapse)`,
      options: [
        ...category.skills.map((s) => ({ value: s.name, label: s.name, hint: hint(s.description), initialValue: selected.has(s.name) })),
        { value: BACK, label: "← Back to categories", hint: "Keep these choices and choose another category" },
      ],
      required: true,
    });
    if (isCancel(picked)) return null;
    for (const skill of category.skills) selected.delete(skill.name);
    for (const name of picked as string[]) if (name !== BACK) selected.add(name);
  }
}

export async function runInteractive(ctx: InteractiveContext): Promise<number> {
  intro("Grimoire");
  const registry = listSkills(ctx.catalogDir);
  if (!registry.length) { log.error("No skills found in the catalog."); return 1; }
  const grouped = categories(registry);
  const selected = await selectSkillsByCategory(grouped);
  if (selected === null) return cancelled();
  if (!selected.length) return cancelled();
  const review = await multiselect({ message: `Review selection: ${selected.length} skill(s)`, options: registry.map((s) => ({ value: s.name, label: s.name, hint: s.category, initialValue: selected.includes(s.name) })), initialValues: selected, required: true });
  if (isCancel(review)) return cancelled();
  const finalSelected = review as string[];
  const target = ctx.targetDirOverride ? undefined : await select({ message: "Which destination agent should receive them?", options: TARGETS.map((t) => ({ value: t.id, label: t.label, hint: displayPath(resolveSkillsDir(t.id, { home: ctx.home, env: ctx.env, projectDir: ctx.projectDir, global: ctx.global }), ctx.home) })) });
  if (target !== undefined && isCancel(target)) return cancelled();
  const targetDir = ctx.targetDirOverride ?? resolveSkillsDir(target as TargetId, { home: ctx.home, env: ctx.env, projectDir: ctx.projectDir, global: ctx.global });
  let overwrite = ctx.overwrite ?? false;
  const conflicts = findConflicts(targetDir, finalSelected);
  if (conflicts.length && !overwrite) { const mode = await select({ message: "Some selected skills already exist. How should Grimoire proceed?", options: [{ value: "skip", label: "Keep existing copies" }, { value: "overwrite", label: "Overwrite existing copies" }, { value: "cancel", label: "Cancel" }] }); if (isCancel(mode) || mode === "cancel") return cancelled(); overwrite = mode === "overwrite"; }
  const confirmed = await select({ message: `Install ${finalSelected.length} skill(s) to ${displayPath(targetDir, ctx.home)}?`, options: [{ value: "confirm", label: "Confirm installation" }, { value: "cancel", label: "Cancel" }] });
  if (isCancel(confirmed) || confirmed !== "confirm") return cancelled();
  const spin = spinner(); spin.start("Installing"); const result = installSkills({ catalogDir: ctx.catalogDir, targetDir, names: finalSelected, overwrite, onStatus: (name) => spin.message(`Installing ${name}`) }); spin.stop("Installation complete");
  if (!ctx.global && (result.installed.length || result.overwritten.length)) {
    const projectDir = resolve(ctx.projectDir ?? process.cwd());
    const lock = readLockfile(projectDir);
    for (const name of [...result.installed, ...result.overwritten]) { const skill = findSkill(ctx.catalogDir, name); if (skill) updateLock(lock, name, { version: skill.version, hash: skillHash(skill.dir), installed: new Date().toISOString(), agents: [target ? String(target) : "custom"] }); }
    writeLockfile(projectDir, lock);
  }
  report(result, targetDir, ctx.home); outro("Ready"); return result.failed.length ? 1 : 0;
}
