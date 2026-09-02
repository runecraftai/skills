import { cancel, intro, isCancel, log, multiselect, note, outro, select, spinner } from "@clack/prompts";
import { resolve } from "node:path";
import { Transform } from "node:stream";
import { findConflicts, installSkills, skillHash, type InstallResult } from "./install.js";
import { categories, findSkill, listSkills } from "./registry.js";
import { readLockfile, updateLock, writeLockfile } from "./lockfile.js";
import { displayPath, resolveSkillsDir, TARGETS, type TargetId } from "./targets.js";

export interface InteractiveContext { catalogDir: string; home: string; env?: Record<string, string | undefined>; targetDirOverride?: string; overwrite?: boolean; projectDir?: string; global?: boolean; }
const hint = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 90);
const cancelled = () => { cancel("Installation cancelled."); return 1; };
function report(result: InstallResult, target: string, home: string) { if (result.installed.length) log.success(`Installed: ${result.installed.join(", ")}`); if (result.overwritten.length) log.info(`Overwritten: ${result.overwritten.join(", ")}`); if (result.skipped.length) log.warn(`Skipped (already installed): ${result.skipped.join(", ")}`); for (const f of result.failed) log.error(`${f.name}: ${f.error}`); note(`Install target: ${displayPath(target, home)}`, "Done"); }

const CONTINUE = "__continue__";

/** Make navigation keys submit the current Clack multiselect selection. */
function backNavigationInput() {
  const input = process.stdin;
  let pending = "";
  const adapter = new Transform({
    transform(chunk, _encoding, callback) {
      const value = pending + chunk.toString();
      pending = value.endsWith("\x1b") ? "\x1b" : value.endsWith("\x1b[") ? "\x1b[" : "";
      const complete = pending ? value.slice(0, -pending.length) : value;
      callback(null, complete.replace(/\x1b\[D|\x7f|\x08/g, "\r"));
    },
    flush(callback) {
      callback(null, pending);
    },
  });
  Object.assign(adapter, {
    isTTY: input.isTTY,
    setRawMode: (mode: boolean) => input.setRawMode?.(mode),
  });
  input.pipe(adapter);
  return { adapter, close: () => { input.unpipe(adapter); adapter.destroy(); } };
}

/** Browse categories while keeping selections across every category visit. */
export async function selectSkillsByCategory(grouped: ReturnType<typeof categories>): Promise<string[] | null> {
  const selectedByCategory = new Map(grouped.map((category) => [category.name, new Set<string>()]));
  while (true) {
    const selected = [...selectedByCategory.values()].reduce((count, skills) => count + skills.size, 0);
    const root = await select({ message: `Choose a category (${selected} selected)`, options: [
      ...grouped.map((c) => {
        const categorySelected = selectedByCategory.get(c.name)?.size ?? 0;
        return { value: c.name, label: `${categorySelected > 0 ? "✓ " : ""}${c.name}`, hint: `${c.skills.length} skill(s), ${categorySelected} selected` };
      }),
      ...(selected > 0 ? [{ value: CONTINUE, label: "Continue with selected skills", hint: "Review and install" }] : []),
    ] });
    if (isCancel(root)) return null;
    if (root === CONTINUE) return grouped.flatMap((category) => [...(selectedByCategory.get(category.name) ?? [])]);
    const category = grouped.find((c) => c.name === root);
    if (!category) continue;
    const navigationInput = backNavigationInput();
    let picked: string | symbol | string[] | undefined;
    try {
      picked = await multiselect({
        message: `${category.name} — select skills (space to toggle, backspace/← to return)`,
        options: category.skills.map((s) => ({ value: s.name, label: s.name, hint: hint(s.description) })),
        initialValues: [...(selectedByCategory.get(category.name) ?? [])],
        required: true,
        input: navigationInput.adapter,
      });
    } finally {
      navigationInput.close();
    }
    if (isCancel(picked)) return null;
    const categorySelected = selectedByCategory.get(category.name);
    if (!categorySelected) continue;
    categorySelected.clear();
    for (const name of picked as string[]) categorySelected.add(name);
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
  const review = await multiselect({ message: `Review selection: ${selected.length} skill(s)`, options: registry.map((s) => ({ value: s.name, label: s.name, hint: s.category })), initialValues: selected, required: true });
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
