import { describe, expect, test } from "bun:test";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
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

  test("install writes scoped ownership without modifying shared legacy fields", () => {
    const f = fixture();
    try {
      expect(applyTuiBatch(f.context, ["alpha"], "install", true).succeeded).toHaveLength(1);
      const entry = readLockfile(f.projectDir).skills.alpha;
      expect(entry.tuiTargets?.["pi:project"]?.destination).toBe(resolve(f.targetDir, "alpha"));
      expect(entry.targets).toBeUndefined();
      expect(entry.fileHashes).toBeUndefined();
      expect(entry.hash).toBe("");
      expect(entry.agents).toContain("pi");
      expect(applyTuiBatch(f.context, ["alpha"], "remove", true).succeeded).toHaveLength(1);
      expect(readLockfile(f.projectDir).skills.alpha).toBeUndefined();
      expect(existsSync(join(f.targetDir, "alpha"))).toBe(false);
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("preview strips controls, normalizes CRLF, and never emits carriage returns", () => {
    expect(previewText("one\r\ntwo")).toBe("one\ntwo");
    expect(previewText("a\rb").includes("\r")).toBe(false);
    expect(previewText("\u001b[31mSafe\u001b[0m text")).toBe("Safe text");
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

  test("status and remove fail closed when an ancestor of the destination is a symlink", () => {
    const f = fixture();
    try {
      expect(applyTuiBatch(f.context, ["alpha"], "install", true).succeeded).toHaveLength(1);
      expect(loadTuiSnapshot(f.context).statuses.alpha.status).toBe("managed-clean");
      const relocated = join(f.root, "relocated");
      renameSync(join(f.projectDir, ".pi"), relocated);
      symlinkSync(relocated, join(f.projectDir, ".pi"));
      expect(loadTuiSnapshot(f.context).statuses.alpha.status).toBe("existing-unmanaged/unknown");
      const outcome = applyTuiBatch(f.context, ["alpha"], "remove", true);
      expect(outcome.failed).toHaveLength(1);
      expect(outcome.failed[0].reason).toContain("managed-clean");
      expect(existsSync(join(relocated, "skills", "alpha", "SKILL.md"))).toBe(true);
      expect(existsSync(join(f.projectDir, ".pi"))).toBe(true);
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

  test("install-phase exceptions become per-skill failures instead of aborting the batch", () => {
    const f = fixture();
    try {
      mkdirSync(join(f.catalogDir, "beta"), { recursive: true });
      writeFileSync(join(f.catalogDir, "beta", "SKILL.md"), "---\nname: beta\ndescription: second skill\n---\nbody\n");
      const elsewhere = join(f.root, "elsewhere");
      mkdirSync(elsewhere);
      symlinkSync(elsewhere, join(f.projectDir, ".pi"));
      const outcome = applyTuiBatch(f.context, ["alpha", "beta"], "install", true);
      expect(outcome.succeeded).toHaveLength(0);
      expect(outcome.failed.map((item) => item.id)).toEqual(["alpha", "beta"]);
      expect(outcome.failed.every((item) => item.reason.includes("symlink"))).toBe(true);
      expect(existsSync(join(elsewhere, "skills"))).toBe(false);
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("ownership stays independent per target and scope across install and removal", () => {
    const f = fixture();
    try {
      const globalCtx = { ...f.context, global: true, env: {} };
      expect(applyTuiBatch(globalCtx, ["alpha"], "install", true).succeeded).toHaveLength(1);
      const globalDestination = loadTuiSnapshot(globalCtx).statuses.alpha.destination;
      expect(loadTuiSnapshot(globalCtx).statuses.alpha.status).toBe("managed-clean");
      expect(applyTuiBatch(f.context, ["alpha"], "install", true).succeeded).toHaveLength(1);
      expect(loadTuiSnapshot(f.context).statuses.alpha.status).toBe("managed-clean");
      expect(loadTuiSnapshot(globalCtx).statuses.alpha.status).toBe("managed-clean");
      expect(applyTuiBatch(f.context, ["alpha"], "remove", true).succeeded).toHaveLength(1);
      expect(existsSync(join(f.targetDir, "alpha"))).toBe(false);
      expect(loadTuiSnapshot(globalCtx).statuses.alpha.status).toBe("managed-clean");
      const entry = readLockfile(f.projectDir).skills.alpha;
      expect(Object.values(entry?.tuiTargets ?? {}).some((record) => record.destination === resolve(globalDestination))).toBe(true);
      expect(entry?.agents).toContain("pi");
      expect(applyTuiBatch(globalCtx, ["alpha"], "remove", true).succeeded).toHaveLength(1);
      expect(existsSync(globalDestination)).toBe(false);
      expect(readLockfile(f.projectDir).skills.alpha).toBeUndefined();
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("install under a changed catalog preserves shared lock metadata", () => {
    const f = fixture();
    try {
      expect(applyTuiBatch(f.context, ["alpha"], "install", true).succeeded).toHaveLength(1);
      writeFileSync(join(f.catalogDir, "alpha", "SKILL.md"), "---\nname: alpha\ndescription: useful skill\n---\nupdated body\n");
      writeFileSync(join(f.catalogDir, "alpha", ".skill-meta.json"), JSON.stringify({ version: "2.0.0" }));
      const other = { ...f.context, target: "claude" as const };
      expect(applyTuiBatch(other, ["alpha"], "install", true).succeeded).toHaveLength(1);
      const entry = readLockfile(f.projectDir).skills.alpha;
      expect(entry?.version).toBe("0.1.0");
      expect(entry?.tuiTargets?.["claude:project"]?.files["SKILL.md"]).toBeDefined();
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });
});
