import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { RegistrySkill } from "./registry.js";
export interface Detection { stack: string[]; recommendations: { name: string; reason: string }[]; skills: string[]; }
const rules = [
  ["Next.js", ["next"], ["next.config.js", "next.config.mjs"], [{ name: "code-review-and-quality", reason: "Next.js projects benefit from consistent review and quality checks." }]],
  ["React", ["react", "react-dom"], ["vite.config.ts", "vite.config.js"], [{ name: "typescript-patterns", reason: "Typed UI projects benefit from reusable TypeScript patterns." }]],
  ["TypeScript", ["typescript"], ["tsconfig.json"], [{ name: "typescript-patterns", reason: "A TypeScript configuration was detected." }]],
  ["Git", [], [".gitignore"], [{ name: "git-worktree", reason: "Git projects can use safer isolated worktrees." }]],
] as const;
export function detectStack(projectDir: string, catalog?: RegistrySkill[]): Detection {
  let packages: Record<string, unknown> = {};
  try { const pkg = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf8")); packages = { ...pkg.dependencies, ...pkg.devDependencies }; } catch {}
  const stack: string[] = []; const recommendations: { name: string; reason: string }[] = [];
  for (const [name, deps, files, suggested] of rules) if (deps.some((dep) => dep in packages) || files.some((file) => existsSync(join(projectDir, file)))) { stack.push(name); recommendations.push(...suggested); }
  const available = catalog ? new Set(catalog.map((s) => s.name)) : undefined;
  const unique = recommendations.filter((r, i, all) => (!available || available.has(r.name)) && all.findIndex((x) => x.name === r.name) === i);
  return { stack, recommendations: unique, skills: unique.map((r) => r.name) };
}
