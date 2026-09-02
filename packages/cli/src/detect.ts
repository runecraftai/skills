import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
export interface Detection { stack: string[]; skills: string[]; }
const rules = [
  ["nextjs", ["next"], ["next.config.js", "next.config.mjs"], ["nextjs-best-practices"]],
  ["react", ["react", "react-dom"], ["vite.config.ts", "vite.config.js"], ["react-patterns"]],
  ["typescript", ["typescript"], ["tsconfig.json"], ["typescript-patterns"]],
] as const;
export function detectStack(projectDir: string): Detection {
  let packages: Record<string, unknown> = {};
  try { const pkg = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf8")); packages = { ...pkg.dependencies, ...pkg.devDependencies }; } catch {}
  const stack: string[] = []; const skills: string[] = [];
  for (const [name, deps, files, suggested] of rules) if (deps.some((dep) => dep in packages) || files.some((file) => existsSync(join(projectDir, file)))) { stack.push(name); skills.push(...suggested); }
  return { stack, skills: [...new Set(skills)] };
}
