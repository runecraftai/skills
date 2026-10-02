import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const packageDir = resolve(import.meta.dir, "..");
const manifest = JSON.parse(readFileSync(resolve(packageDir, "package.json"), "utf8"));

type PackedFile = { path: string; mode: number };

describe("MCP package publication metadata", () => {
  test("packs a freshly built executable after prepack", () => {
    rmSync(resolve(packageDir, "dist"), { recursive: true, force: true });
    const output = execFileSync("npm", ["pack", "--dry-run", "--json", "--foreground-scripts=false"], {
      cwd: packageDir,
      encoding: "utf8",
    });
    const [packed] = JSON.parse(output.slice(output.indexOf("["))) as { files: PackedFile[] }[];
    const files = new Map(packed.files.map((file) => [file.path, file]));
    const executable = files.get("dist/index.js");
    expect(executable).toBeDefined();
    expect((executable?.mode ?? 0) & 0o111).not.toBe(0);

    const binPath = manifest.bin["grimoire-mcp"].replace(/^\.\//, "");
    expect(files.has(binPath)).toBe(true);
  });

  test("declares the provenance repository", () => {
    expect(manifest.repository).toEqual({
      type: "git",
      url: "https://github.com/runecraftai/skills",
    });
  });
});
