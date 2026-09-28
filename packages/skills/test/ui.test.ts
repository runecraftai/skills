import { describe, expect, test } from "bun:test";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { readLockfile } from "../src/lockfile.js";
import { tmpdir } from "node:os";
import { applyTuiBatch } from "../src/tui-actions.js";
import { skillHash } from "../src/install.js";
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
      expect(entry.hash).toBe(skillHash(join(f.catalogDir, "alpha")));
      expect(entry.agents).toContain("pi");
      expect(applyTuiBatch(f.context, ["alpha"], "remove", true).succeeded).toHaveLength(1);
      const cleared = readLockfile(f.projectDir).skills.alpha;
      expect(cleared).toBeUndefined();
      expect(existsSync(join(f.targetDir, "alpha"))).toBe(false);
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("install over a legacy entry preserves shared lock fields", () => {
    const f = fixture();
    try {
      const legacy = { version: "1.0.0", hash: "sha256:legacy", installed: "2024-01-01T00:00:00.000Z", agents: ["pi"], fileHashes: { "SKILL.md": createHash("sha256").update("legacy bytes").digest("hex") }, targets: { pi: join(f.targetDir, "alpha") } };
      writeFileSync(join(f.projectDir, ".grimoire-lock.json"), JSON.stringify({ version: 2, generated: "2024-01-01T00:00:00.000Z", registry: "runecraftai/grimoire", catalogUrl: "", catalogId: "runecraftai/skills", revision: "legacy", skills: { alpha: legacy } }, null, 2));
      expect(applyTuiBatch(f.context, ["alpha"], "install", true).succeeded).toHaveLength(1);
      const entry = readLockfile(f.projectDir).skills.alpha!;
      expect({ version: entry.version, hash: entry.hash, installed: entry.installed, agents: entry.agents, fileHashes: entry.fileHashes, targets: entry.targets }).toEqual(legacy);
      expect(entry.tuiTargets?.["pi:project"]?.destination).toBe(resolve(f.targetDir, "alpha"));
      expect(entry.tuiTargets?.["pi:project"]?.files["SKILL.md"]).toBeDefined();
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("global remove over a legacy entry keeps shared lock fields and the legacy copy", () => {
    const f = fixture();
    try {
      const legacyDestination = join(f.targetDir, "alpha");
      mkdirSync(legacyDestination, { recursive: true });
      writeFileSync(join(legacyDestination, "SKILL.md"), "legacy bytes");
      const legacy = { version: "1.0.0", hash: "sha256:legacy", installed: "2024-01-01T00:00:00.000Z", agents: ["pi"], fileHashes: { "SKILL.md": createHash("sha256").update("legacy bytes").digest("hex") }, targets: { pi: legacyDestination } };
      writeFileSync(join(f.projectDir, ".grimoire-lock.json"), JSON.stringify({ version: 2, generated: "2024-01-01T00:00:00.000Z", registry: "runecraftai/grimoire", catalogUrl: "", catalogId: "runecraftai/skills", revision: "legacy", skills: { alpha: legacy } }, null, 2));
      const globalCtx = { ...f.context, global: true, env: {} };
      expect(applyTuiBatch(globalCtx, ["alpha"], "install", true).succeeded).toHaveLength(1);
      expect(readLockfile(f.projectDir).skills.alpha!.targets).toEqual(legacy.targets);
      expect(applyTuiBatch(globalCtx, ["alpha"], "remove", true).succeeded).toHaveLength(1);
      const entry = readLockfile(f.projectDir).skills.alpha!;
      expect({ version: entry.version, hash: entry.hash, installed: entry.installed, agents: entry.agents, fileHashes: entry.fileHashes, targets: entry.targets }).toEqual(legacy);
      expect(entry.tuiTargets).toBeUndefined();
      expect(existsSync(legacyDestination)).toBe(true);
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("project remove over a legacy entry keeps shared lock fields and the legacy copy", () => {
    const f = fixture();
    try {
      const legacyDestination = join(f.root, "legacy", "alpha");
      mkdirSync(legacyDestination, { recursive: true });
      writeFileSync(join(legacyDestination, "SKILL.md"), "legacy bytes");
      const legacy = { version: "1.0.0", hash: "sha256:legacy", installed: "2024-01-01T00:00:00.000Z", agents: ["pi"], fileHashes: { "SKILL.md": createHash("sha256").update("legacy bytes").digest("hex") }, targets: { pi: legacyDestination } };
      writeFileSync(join(f.projectDir, ".grimoire-lock.json"), JSON.stringify({ version: 2, generated: "2024-01-01T00:00:00.000Z", registry: "runecraftai/grimoire", catalogUrl: "", catalogId: "runecraftai/skills", revision: "legacy", skills: { alpha: legacy } }, null, 2));
      expect(applyTuiBatch(f.context, ["alpha"], "install", true).succeeded).toHaveLength(1);
      expect(readLockfile(f.projectDir).skills.alpha!.targets).toEqual(legacy.targets);
      expect(applyTuiBatch(f.context, ["alpha"], "remove", true).succeeded).toHaveLength(1);
      const entry = readLockfile(f.projectDir).skills.alpha!;
      expect({ version: entry.version, hash: entry.hash, installed: entry.installed, agents: entry.agents, fileHashes: entry.fileHashes, targets: entry.targets }).toEqual(legacy);
      expect(entry.tuiTargets).toBeUndefined();
      expect(existsSync(legacyDestination)).toBe(true);
      expect(existsSync(join(f.targetDir, "alpha"))).toBe(false);
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("TUI remove over a targetless legacy entry preserves its shared metadata", () => {
    const f = fixture();
    try {
      const custom = join(f.root, "custom", "alpha");
      mkdirSync(custom, { recursive: true });
      writeFileSync(join(custom, "SKILL.md"), "custom bytes");
      const legacy = { version: "1.0.0", hash: "sha256:legacy", installed: "2024-01-01T00:00:00.000Z", agents: ["pi"] };
      writeFileSync(join(f.projectDir, ".grimoire-lock.json"), JSON.stringify({ version: 2, generated: "2024-01-01T00:00:00.000Z", registry: "runecraftai/grimoire", catalogUrl: "", catalogId: "runecraftai/skills", revision: "legacy", skills: { alpha: legacy } }, null, 2));
      expect(applyTuiBatch(f.context, ["alpha"], "install", true).succeeded).toHaveLength(1);
      const installed = readLockfile(f.projectDir).skills.alpha!;
      expect({ version: installed.version, hash: installed.hash, installed: installed.installed }).toEqual({ version: legacy.version, hash: legacy.hash, installed: legacy.installed });
      expect(installed.tuiTargets?.["pi:project"]).toBeDefined();
      expect(applyTuiBatch(f.context, ["alpha"], "remove", true).succeeded).toHaveLength(1);
      expect(existsSync(join(f.targetDir, "alpha"))).toBe(false);
      expect(existsSync(join(custom, "SKILL.md"))).toBe(true);
      const cleared = readLockfile(f.projectDir).skills.alpha;
      expect({ version: cleared?.version, hash: cleared?.hash, installed: cleared?.installed }).toEqual({ version: legacy.version, hash: legacy.hash, installed: legacy.installed });
      expect(cleared?.agents).toEqual(["pi"]);
      expect(cleared?.tuiTargets).toBeUndefined();
      expect(cleared?.targets).toBeUndefined();
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("project removal over a global-scoped targetless legacy entry drops it once its copy is removed", () => {
    const f = fixture();
    try {
      mkdirSync(join(f.targetDir, "alpha"), { recursive: true });
      writeFileSync(join(f.targetDir, "alpha", "SKILL.md"), "legacy bytes");
      const legacy = { version: "1.0.0", hash: "sha256:legacy", installed: "2024-01-01T00:00:00.000Z", agents: ["pi"] };
      writeFileSync(join(f.projectDir, ".grimoire-lock.json"), JSON.stringify({ version: 2, generated: "2024-01-01T00:00:00.000Z", registry: "runecraftai/grimoire", catalogUrl: "", catalogId: "runecraftai/skills", revision: "legacy", skills: { alpha: legacy } }, null, 2));
      const globalCtx = { ...f.context, global: true, env: {} };
      expect(applyTuiBatch(globalCtx, ["alpha"], "install", true).succeeded).toHaveLength(1);
      expect(applyTuiBatch(globalCtx, ["alpha"], "remove", true).succeeded).toHaveLength(1);
      expect(readLockfile(f.projectDir).skills.alpha?.agents).toEqual(["pi"]);
      expect(existsSync(join(f.targetDir, "alpha", "SKILL.md"))).toBe(true);
      const cli = join(import.meta.dir, "..", "src", "index.ts");
      const env = { ...process.env, HOME: f.home, XDG_CACHE_HOME: join(f.root, "cache"), GRIMOIRE_CATALOG_URL: "http://127.0.0.1:1/registry.json" };
      const removed = spawnSync("bun", ["run", cli, "remove", "alpha", "--target", "pi", "--force"], { cwd: f.projectDir, encoding: "utf8", env });
      expect(removed.status).toBe(0);
      expect(existsSync(join(f.targetDir, "alpha"))).toBe(false);
      expect(readLockfile(f.projectDir).skills.alpha).toBeUndefined();
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("status and audit report a targetless legacy copy as ownership-unknown beside a scoped record", () => {
    const f = fixture();
    try {
      const custom = join(f.root, "custom", "alpha");
      mkdirSync(custom, { recursive: true });
      writeFileSync(join(custom, "SKILL.md"), "custom bytes");
      const legacy = { version: "1.0.0", hash: "sha256:legacy", installed: "2024-01-01T00:00:00.000Z", agents: ["pi"] };
      writeFileSync(join(f.projectDir, ".grimoire-lock.json"), JSON.stringify({ version: 2, generated: "2024-01-01T00:00:00.000Z", registry: "runecraftai/grimoire", catalogUrl: "", catalogId: "runecraftai/skills", revision: "legacy", skills: { alpha: legacy } }, null, 2));
      expect(applyTuiBatch(f.context, ["alpha"], "install", true).succeeded).toHaveLength(1);
      expect(existsSync(join(custom, "SKILL.md"))).toBe(true);
      mkdirSync(join(f.root, "cache", "runecraft", "grimoire"), { recursive: true });
      const registry = { schemaVersion: 1, catalogVersion: "1.0.0", revision: "rev-test", generatedAt: new Date().toISOString(), skills: [] };
      writeFileSync(join(f.root, "cache", "runecraft", "grimoire", "registry.json"), JSON.stringify({ registry, checkedAt: Date.now() }));
      const env = { ...process.env, HOME: f.home, XDG_CACHE_HOME: join(f.root, "cache"), GRIMOIRE_CATALOG_URL: "http://127.0.0.1:1/registry.json" };
      const cli = join(import.meta.dir, "..", "src", "index.ts");
      const status = spawnSync("bun", ["run", cli, "status"], { cwd: f.projectDir, encoding: "utf8", env });
      expect(status.status).toBe(0);
      expect(status.stdout).toContain("pi:project verified");
      expect(status.stdout).toContain("pi ownership unknown");
      const audit = spawnSync("bun", ["run", cli, "audit"], { cwd: f.projectDir, encoding: "utf8", env });
      expect(audit.status).toBe(0);
      expect(audit.stdout).toContain("alpha/pi: ownership unknown");
      expect(audit.stdout).not.toContain("tampered");
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
