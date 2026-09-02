#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagesDir = join(__dirname, "..", "packages", "skills");

console.log(`Publishing from ${packagesDir}`);
execFileSync("npm", ["publish", "--access", "public"], {
  cwd: packagesDir,
  stdio: "inherit",
});
