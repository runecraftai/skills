import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const manifest = JSON.parse(readFileSync(resolve(import.meta.dir, "../package.json"), "utf8"));

describe("MCP package publication metadata", () => {
  test("matches the provenance repository and builds the executable before packing", () => {
    expect(manifest.repository).toEqual({
      type: "git",
      url: "https://github.com/runecraftai/skills",
    });
    expect(manifest.bin["grimoire-mcp"]).toBe("./dist/index.js");
    expect(manifest.files).toContain("dist");
    expect(manifest.scripts.prepack).toBe("npm run build");
  });
});
