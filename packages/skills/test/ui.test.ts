import { afterEach, describe, expect, mock, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
let selects: unknown[] = [];
let multiselectCalls: Array<{ initialValues?: string[] }> = [];
mock.module("@clack/prompts", () => ({ intro: () => {}, cancel: () => {}, isCancel: (v: unknown) => typeof v === "symbol", log: { success: () => {}, info: () => {}, warn: () => {}, error: () => {} }, note: () => {}, outro: () => {}, select: async () => selects.shift(), multiselect: async (options: { initialValues?: string[] }) => { multiselectCalls.push(options); return selects.shift(); }, spinner: () => ({ start: () => {}, message: () => {}, stop: () => {} }) }));
import { runInteractive } from "../src/ui.js";
const dirs: string[] = [];
afterEach(() => { dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })); selects = []; multiselectCalls = []; });
function skill(catalog: string, name: string) { mkdirSync(join(catalog, name), { recursive: true }); writeFileSync(join(catalog, name, "SKILL.md"), `---\nname: ${name}\n---\n`); }

test("expands, collapses, revisits categories, and installs the revised selection", async () => {
  const root = mkdtempSync(join(tmpdir(), "grimoire-ui-")); dirs.push(root); const catalog = join(root, "catalog");
  skill(catalog, "alpha"); skill(catalog, "beta");
  // Select alpha, return, select beta while retaining alpha, reopen alpha to deselect it, continue, review, confirm.
  selects = ["Other", ["alpha", "__back__"], "Other", ["alpha", "beta"], "Other", ["beta"], "__continue__", ["beta"], "confirm"];
  expect(await runInteractive({ catalogDir: catalog, home: root, targetDirOverride: join(root, "target") })).toBe(0);
  expect(multiselectCalls[1].initialValues).toEqual(["alpha"]);
  expect(multiselectCalls[2].initialValues).toEqual(["alpha", "beta"]);
  expect(existsSync(join(root, "target", "beta", "SKILL.md"))).toBe(true);
  expect(existsSync(join(root, "target", "alpha"))).toBe(false);
});

test("cancellation never installs", async () => {
  const root = mkdtempSync(join(tmpdir(), "grimoire-ui-")); dirs.push(root); const catalog = join(root, "catalog"); skill(catalog, "alpha");
  selects = [Symbol("cancel")];
  expect(await runInteractive({ catalogDir: catalog, home: root, targetDirOverride: join(root, "target") })).toBe(1);
});
