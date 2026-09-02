import { afterEach, describe, expect, mock, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
let selects: unknown[] = [];
let selectCalls: Array<{ options?: Array<{ value: string; label: string; hint?: string }> }> = [];
let multiselectCalls: Array<{ initialValues?: string[]; options?: Array<{ value: string }> }> = [];
mock.module("@clack/prompts", () => ({ intro: () => {}, cancel: () => {}, isCancel: (v: unknown) => typeof v === "symbol", log: { success: () => {}, info: () => {}, warn: () => {}, error: () => {} }, note: () => {}, outro: () => {}, select: async (options: { options?: Array<{ value: string; label: string; hint?: string }> }) => { selectCalls.push(options); return selects.shift(); }, multiselect: async (options: { initialValues?: string[]; options?: Array<{ value: string }> }) => { multiselectCalls.push(options); return selects.shift(); }, spinner: () => ({ start: () => {}, message: () => {}, stop: () => {} }) }));
import { runInteractive, selectSkillsByCategory } from "../src/ui.js";
const dirs: string[] = [];
afterEach(() => { dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })); selects = []; selectCalls = []; multiselectCalls = []; });
function skill(catalog: string, name: string) { mkdirSync(join(catalog, name), { recursive: true }); writeFileSync(join(catalog, name, "SKILL.md"), `---\nname: ${name}\n---\n`); }

test("saves category selections and marks selected categories", async () => {
  const grouped = [{ name: "Alpha", skills: [{ name: "one", description: "", version: "1.0.0", dir: "" }] }] as Parameters<typeof selectSkillsByCategory>[0];
  selects = ["Alpha", ["one"], "Alpha", ["one"], "__continue__"];
  expect(await selectSkillsByCategory(grouped)).toEqual(["one"]);
  expect(multiselectCalls[0].options?.map(({ value }) => value)).toEqual(["one"]);
  expect(multiselectCalls[0].options?.some(({ value }) => value === "__back__")).toBe(false);
  expect(selectCalls[0].options?.[0].label).toBe("Alpha");
  expect(selectCalls[1].options?.[0].label).toBe("✓ Alpha");
  expect(selectCalls[1].options?.[0].hint).toContain("1 selected");
});

test("expands, collapses, revisits categories, and installs the revised selection", async () => {
  const root = mkdtempSync(join(tmpdir(), "grimoire-ui-")); dirs.push(root); const catalog = join(root, "catalog");
  skill(catalog, "alpha"); skill(catalog, "beta");
  // Save alpha, add beta while retaining alpha, then reopen to deselect alpha.
  selects = ["Other", ["alpha"], "Other", ["alpha", "beta"], "Other", ["beta"], "__continue__", "confirm"];
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
