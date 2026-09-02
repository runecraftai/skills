/**
 * Install logic: copy selected skill folders from the catalog into a target
 * skills directory, deciding per skill whether to skip (already installed),
 * overwrite, or fail (not in catalog / copy error).
 *
 * Pure filesystem code — the interactive TUI and the scripting flag path both
 * drive this, and tests exercise it against temp directories only.
 */
import { cpSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

export interface InstallOptions {
  /** Source catalog directory (the package's skills/ folder). */
  catalogDir: string;
  /** Destination skills directory (e.g. ~/.pi/agent/skills). Created if missing. */
  targetDir: string;
  /** Skill folder names to install. */
  names: string[];
  /** When false (default), existing installations are skipped, not replaced. */
  overwrite?: boolean;
  /** Progress hook invoked before each skill copy (for spinner UX). */
  onStatus?: (skillName: string) => void;
}

export interface InstallResult {
  installed: string[];
  overwritten: string[];
  skipped: string[];
  failed: { name: string; error: string }[];
}

/** Which of the given skills are already present in the target directory. */
export function findConflicts(targetDir: string, names: string[]): string[] {
  return names.filter((name) => existsSync(join(targetDir, name)));
}

export function installSkills(opts: InstallOptions): InstallResult {
  const result: InstallResult = { installed: [], overwritten: [], skipped: [], failed: [] };
  mkdirSync(opts.targetDir, { recursive: true });

  for (const name of opts.names) {
    opts.onStatus?.(name);
    const src = join(opts.catalogDir, name);
    const dest = join(opts.targetDir, name);

    let isDir = false;
    try {
      isDir = statSync(src).isDirectory();
    } catch {
      isDir = false;
    }
    if (!isDir) {
      result.failed.push({ name, error: `not found in catalog: ${name}` });
      continue;
    }

    const exists = existsSync(dest);
    if (exists && !opts.overwrite) {
      result.skipped.push(name);
      continue;
    }

    try {
      if (exists && statSync(dest).isDirectory()) {
        rmSync(dest, { recursive: true, force: true });
      }
      cpSync(src, dest, { recursive: true, force: true });
      (exists ? result.overwritten : result.installed).push(name);
    } catch (err) {
      result.failed.push({ name, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return result;
}
