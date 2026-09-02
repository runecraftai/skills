import { cancel, intro, isCancel, log, multiselect, note, outro, select, spinner, text } from "@clack/prompts";
import { detectStack } from "./detect.js";
import { findConflicts, installSkills, type InstallResult } from "./install.js";
import { categories, listSkills, type RegistrySkill } from "./registry.js";
import { displayPath, resolveSkillsDir, TARGETS, type TargetId } from "./targets.js";

export interface InteractiveContext { catalogDir: string; home: string; env?: Record<string, string | undefined>; targetDirOverride?: string; overwrite?: boolean; projectDir?: string; }
const hint = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 90);
const cancelled = () => { cancel("Installation cancelled."); return 1; };
function report(result: InstallResult, target: string, home: string) { if (result.installed.length) log.success(`Installed: ${result.installed.join(", ")}`); if (result.overwritten.length) log.info(`Overwritten: ${result.overwritten.join(", ")}`); if (result.skipped.length) log.warn(`Skipped (already installed): ${result.skipped.join(", ")}`); for (const f of result.failed) log.error(`${f.name}: ${f.error}`); note(`Install target: ${displayPath(target, home)}`, "Done"); }

export async function runInteractive(ctx: InteractiveContext): Promise<number> {
  intro("Grimoire");
  const registry = listSkills(ctx.catalogDir);
  if (!registry.length) { log.error("No skills found in the catalog."); return 1; }
  const grouped = categories(registry);
  const root = await select({ message: "What would you like to do?", options: [
    ...grouped.map((c) => ({ value: `category:${c.name}`, label: c.name, hint: `${c.skills.length} skill(s)` })),
    { value: "detect", label: "Detect project skills", hint: "Analyze this project and recommend relevant skills" },
    { value: "search", label: "Search all skills", hint: "Find a skill by name or description" },
  ] });
  if (isCancel(root)) return cancelled();
  let selected: string[];
  if (root === "detect") {
    const detection = detectStack(ctx.projectDir ?? process.cwd(), registry);
    if (!detection.recommendations.length) log.info("No matching recommendations found; browse a category instead.");
    else note(detection.recommendations.map((r) => `${r.name}: ${r.reason}`).join("\n"), `Detected ${detection.stack.join(", ") || "no known stack"}`);
    const picked = await multiselect({ message: "Review recommendations (add or remove skills)", options: registry.map((s) => ({ value: s.name, label: s.name, hint: hint(s.description), initialValue: detection.skills.includes(s.name) })), required: true });
    if (isCancel(picked)) return cancelled(); selected = picked as string[];
  } else {
    let options: RegistrySkill[];
    if (root === "search") {
      const query = await text({ message: "Search skills" });
      if (isCancel(query)) return cancelled();
      const needle = String(query).toLowerCase();
      options = registry.filter((s) => `${s.name} ${s.description} ${s.category}`.toLowerCase().includes(needle));
      if (!options.length) { log.error("No matching skills."); return 1; }
    } else options = grouped.find((c) => c.name === String(root).slice(9))?.skills ?? registry;
    const picked = await multiselect({ message: "Select skills (space to toggle, enter to continue)", options: options.map((s) => ({ value: s.name, label: s.name, hint: hint(s.description) })), required: true });
    if (isCancel(picked)) return cancelled(); selected = picked as string[];
  }
  const review = await multiselect({ message: `Review selection: ${selected.length} skill(s)`, options: registry.map((s) => ({ value: s.name, label: s.name, hint: s.category })), initialValues: selected, required: true });
  if (isCancel(review)) return cancelled(); selected = review as string[];
  const target = ctx.targetDirOverride ? undefined : await select({ message: "Which destination agent should receive them?", options: TARGETS.map((t) => ({ value: t.id, label: t.label, hint: displayPath(resolveSkillsDir(t.id, { home: ctx.home, env: ctx.env }), ctx.home) })) });
  if (target !== undefined && isCancel(target)) return cancelled();
  const targetDir = ctx.targetDirOverride ?? resolveSkillsDir(target as TargetId, { home: ctx.home, env: ctx.env });
  let overwrite = ctx.overwrite ?? false;
  const conflicts = findConflicts(targetDir, selected);
  if (conflicts.length && !overwrite) { const mode = await select({ message: "Some selected skills already exist. How should Grimoire proceed?", options: [{ value: "skip", label: "Keep existing copies" }, { value: "overwrite", label: "Overwrite existing copies" }, { value: "cancel", label: "Cancel" }] }); if (isCancel(mode) || mode === "cancel") return cancelled(); overwrite = mode === "overwrite"; }
  const confirmed = await select({ message: `Install ${selected.length} skill(s) to ${displayPath(targetDir, ctx.home)}?`, options: [{ value: "confirm", label: "Confirm installation" }, { value: "cancel", label: "Cancel" }] });
  if (isCancel(confirmed) || confirmed !== "confirm") return cancelled();
  const spin = spinner(); spin.start("Installing"); const result = installSkills({ catalogDir: ctx.catalogDir, targetDir, names: selected, overwrite, onStatus: (name) => spin.message(`Installing ${name}`) }); spin.stop("Installation complete"); report(result, targetDir, ctx.home); outro("Ready"); return result.failed.length ? 1 : 0;
}
