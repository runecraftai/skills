/**
 * Interactive installer flow, powered by clack:
 *   catalog -> multi-select skills -> pick agent target -> resolve conflicts
 *   -> install with spinner -> colored summary.
 */
import { cancel, intro, isCancel, log, multiselect, note, outro, select, spinner } from "@clack/prompts";

import { findConflicts, installSkills, type InstallResult } from "./install.js";
import { listSkills } from "./skills.js";
import { displayPath, resolveSkillsDir, TARGETS, type TargetId } from "./targets.js";

export interface InteractiveContext {
  catalogDir: string;
  home: string;
  env?: Record<string, string | undefined>;
  /** Optional explicit destination, bypassing per-target resolution. */
  targetDirOverride?: string;
  /** When set, already-installed skills are replaced without asking. */
  overwrite?: boolean;
}

const MAX_HINT = 90;

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : clean.slice(0, max - 1) + "…";
}

function cancelled(message = "Installation cancelled."): number {
  cancel(message);
  return 1;
}

function report(result: InstallResult, targetDir: string, home: string): void {
  if (result.installed.length > 0) {
    log.success(`Installed ${result.installed.length} skill(s): ${result.installed.join(", ")}`);
  }
  if (result.overwritten.length > 0) {
    log.info(`Overwritten ${result.overwritten.length} skill(s): ${result.overwritten.join(", ")}`);
  }
  if (result.skipped.length > 0) {
    log.warn(`Already installed, skipped: ${result.skipped.join(", ")}`);
  }
  for (const failure of result.failed) {
    log.error(`${failure.name}: ${failure.error}`);
  }
  note(
    `Install target: ${displayPath(targetDir, home)}\n` +
      "Restart your agent (or reload its skills) to pick up the new skills.",
    "Done",
  );
}

export async function runInteractive(ctx: InteractiveContext): Promise<number> {
  intro("Runecraft Skills");

  const catalog = listSkills(ctx.catalogDir);
  if (catalog.length === 0) {
    log.error(`No skills found in ${ctx.catalogDir} — nothing to install.`);
    outro("Nothing to do.");
    return 1;
  }

  const chosen = await multiselect({
    message: "Which skills do you want to install?",
    options: catalog.map((skill) => ({
      value: skill.name,
      label: skill.name,
      hint: skill.description ? truncate(skill.description, MAX_HINT) : undefined,
    })),
    required: true,
  });
  if (isCancel(chosen)) return cancelled();
  const names = chosen as string[];

  let targetDir: string;
  if (ctx.targetDirOverride !== undefined) {
    targetDir = ctx.targetDirOverride;
  } else {
    const target = await select({
      message: "Which agent should get them?",
      options: TARGETS.map((t) => ({
        value: t.id,
        label: t.label,
        hint: displayPath(resolveSkillsDir(t.id, ctx), ctx.home),
      })),
    });
    if (isCancel(target)) return cancelled();
    targetDir = resolveSkillsDir(target as TargetId, ctx);
  }

  const conflicts = findConflicts(targetDir, names);
  let overwrite = ctx.overwrite ?? false;
  if (conflicts.length > 0 && !overwrite) {
    const mode = await select({
      message: `${conflicts.length} skill(s) are already installed at ${displayPath(targetDir, ctx.home)}. How to proceed?`,
      options: [
        { value: "skip", label: "Skip existing", hint: "Keep your current copies" },
        { value: "overwrite", label: "Overwrite existing", hint: "Replace them with the catalog versions" },
        { value: "cancel", label: "Cancel" },
      ],
    });
    if (isCancel(mode)) return cancelled();
    if (mode === "cancel") return cancelled();
    overwrite = mode === "overwrite";
  }

  const spin = spinner();
  spin.start("Installing");
  const result = installSkills({
    catalogDir: ctx.catalogDir,
    targetDir,
    names,
    overwrite,
    onStatus: (name) => spin.message(`Installing ${name}`),
  });
  spin.stop(result.failed.length > 0 ? "Install finished with errors" : "Install complete");

  report(result, targetDir, ctx.home);
  return result.failed.length > 0 ? 1 : 0;
}
