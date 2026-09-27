import { describe, expect, test } from "bun:test";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { readLockfile } from "../src/lockfile.js";
import { tmpdir } from "node:os";
import { applyTuiBatch } from "../src/tui-actions.js";
import { loadTuiSnapshot, previewText } from "../src/tui-model.js";
import { initialTuiState, moveHighlight, toggleSelected, visibleBatchIds } from "../src/tui-state.js";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "grimoire-tui-")), catalogDir = join(root, "catalog"), projectDir = join(root, "project"), home = join(root, "home");
  mkdirSync(projectDir); mkdirSync(home); mkdirSync(join(catalogDir, "alpha", "references"), { recursive: true });
  writeFileSync(join(catalogDir, "alpha", "SKILL.md"), "---\nname: alpha\ndescription: useful skill\n---\n\u001b[31mSafe text\u001b[0m\n");
  writeFileSync(join(catalogDir, "alpha", "references", "guide.md"), "reference");
  return { root, catalogDir, projectDir, home, targetDir: join(projectDir, ".pi", "skills"), context: { catalogDir, projectDir, home, global: false, target: "pi" as const } };
}

describe("TUI view model and actions", () => {
  test("keeps highlighted and selected IDs independent and filters by metadata", () => {
    const f = fixture();
    try {
      const skills = loadTuiSnapshot(f.context).skills;
      let state = { ...initialTuiState(), highlighted: skills[0].id };
      state = toggleSelected(state);
      state = { ...state, query: "useful" };
      expect(visibleBatchIds(state)).toEqual([skills[0].id]);
      expect(moveHighlight(state, skills, 1).highlighted).toBe(skills[0].id);
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("refresh is read-only, exposes the resolved scope, and preview strips controls", () => {
    const f = fixture();
    try {
      const snapshot = loadTuiSnapshot(f.context);
      expect(snapshot.statuses["alpha"].status).toBe("absent");
      expect(existsSync(f.targetDir)).toBe(false);
      expect(snapshot.skills[0].files).toEqual(["references/guide.md"]);
      expect(previewText(snapshot.skills[0].content).includes("\u001b")).toBe(false);
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("confirmed install records per-target verified ownership; modified copy cannot be removed", () => {
    const f = fixture();
    try {
      let outcome = applyTuiBatch(f.context, ["alpha"], "install", true);
      expect(outcome.succeeded).toHaveLength(1);
      expect(loadTuiSnapshot(f.context).statuses.alpha.status).toBe("managed-clean");
      writeFileSync(join(f.targetDir, "alpha", "extra.txt"), "unexpected");
      expect(loadTuiSnapshot(f.context).statuses.alpha.status).toBe("managed-modified");
      rmSync(join(f.targetDir, "alpha", "extra.txt"));
      writeFileSync(join(f.targetDir, "alpha", "SKILL.md"), "changed");
      expect(loadTuiSnapshot(f.context).statuses.alpha.status).toBe("managed-modified");
      outcome = applyTuiBatch(f.context, ["alpha"], "remove", true);
      expect(outcome.failed).toHaveLength(1);
      expect(existsSync(join(f.targetDir, "alpha", "SKILL.md"))).toBe(true);
      copyFileSync(join(f.catalogDir, "alpha", "SKILL.md"), join(f.targetDir, "alpha", "SKILL.md"));
      expect(loadTuiSnapshot(f.context).statuses.alpha.status).toBe("managed-clean");
      outcome = applyTuiBatch(f.context, ["alpha"], "remove", true);
      expect(outcome.succeeded).toHaveLength(1);
      expect(existsSync(join(f.targetDir, "alpha"))).toBe(false);
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("install writes shared lock ownership and remove clears it symmetrically", () => {
    const f = fixture();
    try {
      expect(applyTuiBatch(f.context, ["alpha"], "install", true).succeeded).toHaveLength(1);
      const entry = readLockfile(f.projectDir).skills.alpha;
      expect(entry.targets?.pi).toBe(resolve(f.targetDir, "alpha"));
      expect(resolve(entry.targets!.pi, "..")).toBe(resolve(f.targetDir));
      expect(entry.hash).not.toBe("");
      expect(Object.keys(entry.fileHashes ?? {})).toContain("SKILL.md");
      expect(entry.agents).toContain("pi");
      expect(applyTuiBatch(f.context, ["alpha"], "remove", true).succeeded).toHaveLength(1);
      expect(readLockfile(f.projectDir).skills.alpha).toBeUndefined();
      expect(existsSync(join(f.targetDir, "alpha"))).toBe(false);
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("unmanaged conflicts and malformed locks fail closed", () => {
    const f = fixture();
    try {
      mkdirSync(join(f.targetDir, "alpha"), { recursive: true });
      expect(loadTuiSnapshot(f.context).statuses.alpha.status).toBe("existing-unmanaged/unknown");
      expect(applyTuiBatch(f.context, ["alpha"], "install", true).failed).toHaveLength(1);
      writeFileSync(join(f.projectDir, ".grimoire-lock.json"), JSON.stringify({ version: 1, skills: { alpha: { version: "1", hash: "legacy", installed: "now", agents: ["pi"] } } }));
      expect(loadTuiSnapshot(f.context).statuses.alpha.status).toBe("existing-unmanaged/unknown");
      expect(applyTuiBatch(f.context, ["alpha"], "remove", true).failed).toHaveLength(1);
      writeFileSync(join(f.projectDir, ".grimoire-lock.json"), "{");
      expect(loadTuiSnapshot(f.context).statuses.alpha.status).toBe("unreadable/error");
      expect(applyTuiBatch(f.context, ["alpha"], "install", true).failed[0].reason).toContain("lockfile error");
      writeFileSync(join(f.projectDir, ".grimoire-lock.json"), JSON.stringify({ version: 2, skills: {} }));
      rmSync(join(f.targetDir, "alpha"), { recursive: true });
      symlinkSync(join(f.catalogDir, "alpha"), join(f.targetDir, "alpha"));
      expect(loadTuiSnapshot(f.context).statuses.alpha.status).toBe("existing-unmanaged/unknown");
      expect(applyTuiBatch(f.context, ["alpha"], "remove", true).failed).toHaveLength(1);
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("cancelled action performs no filesystem writes", () => {
    const f = fixture();
    try {
      expect(applyTuiBatch(f.context, ["alpha"], "install", false).succeeded).toHaveLength(0);
      expect(existsSync(f.targetDir)).toBe(false);
      expect(existsSync(join(f.projectDir, ".grimoire-lock.json"))).toBe(false);
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });
});
