import { afterEach, describe, expect, mock, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const selectCalls: { message: string }[] = [];
let selectResults: (string | symbol)[] = [];

mock.module("@clack/prompts", () => ({
  intro: () => {},
  cancel: () => {},
  isCancel: (value: unknown) => typeof value === "symbol",
  log: { success: () => {}, info: () => {}, warn: () => {}, error: () => {} },
  multiselect: async () => ["alpha"],
  note: () => {},
  outro: () => {},
  select: async (opts: { message: string }) => {
    selectCalls.push({ message: opts.message });
    const next = selectResults.shift();
    return next === undefined ? "skip" : next;
  },
  spinner: () => ({ start: () => {}, message: () => {}, stop: () => {} }),
}));

import { runInteractive } from "../src/ui.js";

let dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  dirs = [];
  selectCalls.length = 0;
  selectResults = [];
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "skills-ui-"));
  dirs.push(dir);
  return dir;
}

/** Build a catalog dir containing the "alpha" skill. */
function makeCatalog(root: string): string {
  const catalog = join(root, "catalog");
  mkdirSync(join(catalog, "alpha", "references"), { recursive: true });
  writeFileSync(join(catalog, "alpha", "SKILL.md"), "# alpha\n");
  writeFileSync(join(catalog, "alpha", "references", "guide.md"), "guide for alpha\n");
  return catalog;
}

/** Target dir with a pre-existing (stale) copy of "alpha". */
function makeInstalledTarget(root: string): string {
  const target = join(root, "target");
  mkdirSync(join(target, "alpha"), { recursive: true });
  writeFileSync(join(target, "alpha", "SKILL.md"), "user's local copy\n");
  return target;
}

describe("runInteractive", () => {
  test("with overwrite:true, replaces the existing skill without showing the conflict prompt", async () => {
    const root = tempDir();
    const catalog = makeCatalog(root);
    const target = makeInstalledTarget(root);

    const code = await runInteractive({ catalogDir: catalog, home: root, targetDirOverride: target, overwrite: true });

    expect(code).toBe(0);
    expect(selectCalls).toEqual([]);
    expect(readFileSync(join(target, "alpha", "SKILL.md"), "utf8")).toBe("# alpha\n");
  });

  test("without overwrite, asks the conflict prompt and honors a skip answer", async () => {
    const root = tempDir();
    const catalog = makeCatalog(root);
    const target = makeInstalledTarget(root);
    selectResults = ["skip"];

    const code = await runInteractive({ catalogDir: catalog, home: root, targetDirOverride: target });

    expect(code).toBe(0);
    expect(selectCalls).toHaveLength(1);
    expect(selectCalls[0].message).toContain("already installed");
    expect(readFileSync(join(target, "alpha", "SKILL.md"), "utf8")).toBe("user's local copy\n");
  });

  test("without overwrite, an 'overwrite' answer replaces the existing skill", async () => {
    const root = tempDir();
    const catalog = makeCatalog(root);
    const target = makeInstalledTarget(root);
    selectResults = ["overwrite"];

    const code = await runInteractive({ catalogDir: catalog, home: root, targetDirOverride: target });

    expect(code).toBe(0);
    expect(readFileSync(join(target, "alpha", "SKILL.md"), "utf8")).toBe("# alpha\n");
  });
});
