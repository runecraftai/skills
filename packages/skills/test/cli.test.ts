import { describe, expect, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedLegacyEntry, seedOfflineRegistry } from "./helpers.js";
const CLI = join(import.meta.dir, "..", "src", "index.ts");
const run = (args: string[]) => spawnSync("bun", ["run", CLI, ...args], { encoding: "utf8" });
const sha256 = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
function scopeFixture() {
  const root = mkdtempSync(join(tmpdir(), "grimoire-scope-"));
  const project = root, home = join(root, "home");
  const projectDest = join(project, ".pi", "skills", "alpha"), globalDest = join(home, ".pi", "agent", "skills", "alpha");
  mkdirSync(projectDest, { recursive: true }); mkdirSync(globalDest, { recursive: true });
  writeFileSync(join(projectDest, "SKILL.md"), "project bytes");
  writeFileSync(join(globalDest, "SKILL.md"), "global bytes");
  const lock = {
    version: 2, generated: new Date().toISOString(), registry: "runecraftai/grimoire", catalogUrl: "", catalogId: "runecraftai/skills", revision: "local",
    skills: { alpha: {
      version: "1.0.0", hash: "sha256:aaa", installed: new Date().toISOString(), agents: ["pi"],
      fileHashes: { "SKILL.md": sha256("project bytes") }, targets: { pi: projectDest },
      tuiTargets: {
        "pi:project": { destination: projectDest, scope: "project", files: { "SKILL.md": sha256("project bytes") }, identity: "alpha" },
        "pi:global": { destination: globalDest, scope: "global", files: { "SKILL.md": sha256("global bytes") }, identity: "alpha" },
      },
    } },
  };
  writeFileSync(join(project, ".grimoire-lock.json"), JSON.stringify(lock, null, 2));
  const env = { ...process.env, HOME: home, XDG_CACHE_HOME: join(root, "cache"), GRIMOIRE_CATALOG_URL: "http://127.0.0.1:1/registry.json" };
  return { root, project, home, projectDest, globalDest, env };
}
describe("grimoire CLI", () => {
  test("lists categorized catalog entries", () => { const r = run(["list"]); expect(r.status).toBe(0); expect(r.stdout).toContain("[Planning & Specification]"); expect(r.stdout).toContain("spec-driven"); }, 15000);
  test("detect prints recommendations", () => { const dir = mkdtempSync(join(tmpdir(), "grimoire-cli-")); try { writeFileSync(join(dir, "tsconfig.json"), "{}"); const r = spawnSync("bun", ["run", CLI, "detect"], { cwd: dir, encoding: "utf8" }); expect(r.status).toBe(0); expect(r.stdout).toContain("typescript-patterns"); } finally { rmSync(dir, { recursive: true, force: true }); } });
  test("noninteractive install copies selected skill", () => { const project = mkdtempSync(join(tmpdir(), "grimoire-project-")), target = join(project, "target"); try { const r = spawnSync("bun", ["run", CLI, "install", "-s", "spec-driven", "-t", "pi", "--target-dir", target], { cwd: project, encoding: "utf8" }); expect(r.status).toBe(0); expect(existsSync(join(target, "spec-driven", "SKILL.md"))).toBe(true); expect(existsSync(join(project, ".grimoire-lock.json"))).toBe(true); } finally { rmSync(project, { recursive: true, force: true }); } });
  test("help identifies the single executable without loading the renderer", () => { const r = spawnSync("bun", ["run", CLI, "--help"], { encoding: "utf8", env: { ...process.env, OPENTUI_LIBC: "invalid" } }); expect(r.status).toBe(0); expect(r.stdout).toContain("grimoire"); expect(r.stdout).toContain("--target-dir"); });
  test("no-arg and leading --global refuse non-TTY without writes", () => {
    const root = mkdtempSync(join(tmpdir(), "grimoire-nontty-")), project = root, home = join(root, "home");
    try {
      for (const args of [[], ["--global"]]) {
        const r = spawnSync("bun", ["run", CLI, ...args], { cwd: project, encoding: "utf8", env: { ...process.env, HOME: home, XDG_CONFIG_HOME: join(home, ".config"), BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0" } });
        expect(r.status).toBe(1); expect(r.stdout).toBe(""); expect(r.stderr.trim().split("\n")).toHaveLength(1); expect(r.stderr).toContain("stdin and stdout must both be TTYs");
        expect(existsSync(join(project, ".grimoire-lock.json"))).toBe(false); expect(existsSync(home)).toBe(false);
      }
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  test("scriptable remove clears only the requested scope record and retains its sibling", () => {
    const f = scopeFixture();
    try {
      const first = spawnSync("bun", ["run", CLI, "remove", "alpha", "--force"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(first.status).toBe(0);
      expect(existsSync(f.projectDest)).toBe(false);
      expect(existsSync(f.globalDest)).toBe(true);
      const afterFirst = JSON.parse(readFileSync(join(f.project, ".grimoire-lock.json"), "utf8"));
      expect(Object.keys(afterFirst.skills.alpha.tuiTargets)).toEqual(["pi:global"]);
      expect(afterFirst.skills.alpha.targets).toBeUndefined();
      expect(afterFirst.skills.alpha.version).toBe("1.0.0");
      expect(afterFirst.skills.alpha.fileHashes).toEqual({ "SKILL.md": sha256("project bytes") });
      expect(afterFirst.skills.alpha.agents).toContain("pi");
      const second = spawnSync("bun", ["run", CLI, "--global", "remove", "alpha", "--force"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(second.status).toBe(0);
      expect(existsSync(f.globalDest)).toBe(false);
      const afterSecond = JSON.parse(readFileSync(join(f.project, ".grimoire-lock.json"), "utf8"));
      expect(afterSecond.skills.alpha).toBeUndefined();
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("scriptable remove without --force refuses a scope with no verified ownership", () => {
    const f = scopeFixture();
    try {
      const lockFile = join(f.project, ".grimoire-lock.json");
      const lock = JSON.parse(readFileSync(lockFile, "utf8"));
      delete lock.skills.alpha.tuiTargets["pi:project"];
      writeFileSync(lockFile, JSON.stringify(lock, null, 2));
      seedOfflineRegistry(f.root);
      const denied = spawnSync("bun", ["run", CLI, "remove", "alpha"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(denied.status).toBe(1);
      expect(denied.stderr).toContain("--force");
      expect(existsSync(f.projectDest)).toBe(true);
      expect(existsSync(f.globalDest)).toBe(true);
      const forced = spawnSync("bun", ["run", CLI, "remove", "alpha", "--force"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(forced.status).toBe(0);
      expect(existsSync(f.projectDest)).toBe(false);
      expect(existsSync(f.globalDest)).toBe(true);
      const after = JSON.parse(readFileSync(lockFile, "utf8"));
      expect(Object.keys(after.skills.alpha.tuiTargets)).toEqual(["pi:global"]);
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("scriptable remove drops an entry whose tracked copy is already gone", () => {
    const f = scopeFixture();
    try {
      const lockFile = join(f.project, ".grimoire-lock.json");
      const lock = JSON.parse(readFileSync(lockFile, "utf8"));
      delete lock.skills.alpha.tuiTargets["pi:global"];
      writeFileSync(lockFile, JSON.stringify(lock, null, 2));
      rmSync(f.projectDest, { recursive: true, force: true });
      seedOfflineRegistry(f.root);
      const removed = spawnSync("bun", ["run", CLI, "remove", "alpha", "--target", "pi"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(removed.status).toBe(0);
      const after = JSON.parse(readFileSync(lockFile, "utf8"));
      expect(after.skills.alpha).toBeUndefined();
      const status = spawnSync("bun", ["run", CLI, "status"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(status.status).toBe(0);
      expect(status.stdout).toContain("No tracked project installations.");
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("status and audit report an uncovered legacy claim beside a record-covered slot", () => {
    const f = scopeFixture();
    try {
      const lockFile = join(f.project, ".grimoire-lock.json");
      const lock = JSON.parse(readFileSync(lockFile, "utf8"));
      lock.skills.alpha.legacyAgents = ["pi"];
      writeFileSync(lockFile, JSON.stringify(lock, null, 2));
      const status = spawnSync("bun", ["run", CLI, "status"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(status.status).toBe(0);
      expect(status.stdout).toContain("pi:project verified");
      expect(status.stdout).toContain("pi ownership unknown");
      seedOfflineRegistry(f.root);
      const audit = spawnSync("bun", ["run", CLI, "audit"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(audit.status).toBe(0);
      expect(audit.stdout).toContain("No tracked install issues found");
      expect(audit.stdout).toContain("alpha/pi: ownership unknown");
      expect(audit.stdout).not.toContain("tampered");
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("audit verifies every scope record against its own hashes", () => {
    const f = scopeFixture();
    try {
      seedOfflineRegistry(f.root);
      const clean = spawnSync("bun", ["run", CLI, "audit"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(clean.status).toBe(0);
      expect(clean.stdout).toContain("No tracked install issues found");
      writeFileSync(join(f.globalDest, "SKILL.md"), "tampered");
      const dirty = spawnSync("bun", ["run", CLI, "audit"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(dirty.status).toBe(1);
      expect(dirty.stdout).toContain("alpha/SKILL.md: tampered (pi:global)");
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("audit reports legacy installs without scope records as ownership-unknown", () => {
    const f = scopeFixture();
    try {
      const lock = JSON.parse(readFileSync(join(f.project, ".grimoire-lock.json"), "utf8"));
      delete lock.skills.alpha.tuiTargets;
      writeFileSync(join(f.project, ".grimoire-lock.json"), JSON.stringify(lock, null, 2));
      seedOfflineRegistry(f.root);
      const clean = spawnSync("bun", ["run", CLI, "audit"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(clean.status).toBe(0);
      expect(clean.stdout).toContain("No tracked install issues found");
      expect(clean.stdout).toContain("alpha/pi: ownership unknown");
      writeFileSync(join(f.projectDest, "SKILL.md"), "tampered");
      const dirty = spawnSync("bun", ["run", CLI, "audit"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(dirty.status).toBe(0);
      expect(dirty.stdout).toContain("No tracked install issues found");
      expect(dirty.stdout).toContain("alpha/pi: ownership unknown");
      writeFileSync(join(f.projectDest, "SKILL.md"), "project bytes");
      const restored = spawnSync("bun", ["run", CLI, "audit"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(restored.status).toBe(0);
      rmSync(join(f.projectDest, "SKILL.md"));
      const missing = spawnSync("bun", ["run", CLI, "audit"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(missing.status).toBe(0);
      expect(missing.stdout).toContain("No tracked install issues found");
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("status reports verification against each scope record's hashes", () => {
    const f = scopeFixture();
    try {
      const clean = spawnSync("bun", ["run", CLI, "status"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(clean.status).toBe(0);
      expect(clean.stdout).toContain("alpha [pi]");
      expect(clean.stdout).toContain("pi:project verified");
      expect(clean.stdout).toContain("pi:global verified");
      writeFileSync(join(f.globalDest, "SKILL.md"), "tampered");
      const dirty = spawnSync("bun", ["run", CLI, "status"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(dirty.status).toBe(0);
      expect(dirty.stdout).toContain("pi:global modified: SKILL.md");
      expect(dirty.stdout).toContain("pi:project verified");
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("status reports legacy installs without scope records as ownership-unknown", () => {
    const f = scopeFixture();
    try {
      const lockFile = join(f.project, ".grimoire-lock.json");
      const lock = JSON.parse(readFileSync(lockFile, "utf8"));
      delete lock.skills.alpha.tuiTargets;
      writeFileSync(lockFile, JSON.stringify(lock, null, 2));
      const r = spawnSync("bun", ["run", CLI, "status"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("alpha [pi]");
      expect(r.stdout).toContain("pi ownership unknown");
      expect(r.stdout).not.toContain("verified");
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("status and audit report targetless legacy installs as ownership-unknown", () => {
    const f = scopeFixture();
    try {
      const lockFile = join(f.project, ".grimoire-lock.json");
      seedLegacyEntry(lockFile);
      const status = spawnSync("bun", ["run", CLI, "status"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(status.status).toBe(0);
      expect(status.stdout).toContain("alpha [pi]");
      expect(status.stdout).toContain("pi ownership unknown");
      expect(status.stdout).not.toContain("verified");
      seedOfflineRegistry(f.root);
      const audit = spawnSync("bun", ["run", CLI, "audit"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(audit.status).toBe(0);
      expect(audit.stdout).toContain("No tracked install issues found");
      expect(audit.stdout).toContain("alpha/pi: ownership unknown");
      expect(audit.stdout).not.toContain("tampered");
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("scriptable force removal preserves targetless legacy metadata and untracked copy", () => {
    const f = scopeFixture();
    try {
      const custom = join(f.root, "custom", "alpha");
      mkdirSync(custom, { recursive: true });
      writeFileSync(join(custom, "SKILL.md"), "custom bytes");
      const lockFile = join(f.project, ".grimoire-lock.json");
      const legacy = seedLegacyEntry(lockFile);
      rmSync(f.projectDest, { recursive: true, force: true });
      const removed = spawnSync("bun", ["run", CLI, "remove", "alpha", "--force"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(removed.status).toBe(0);
      expect(existsSync(join(custom, "SKILL.md"))).toBe(true);
      const after = JSON.parse(readFileSync(lockFile, "utf8"));
      expect({ version: after.skills.alpha.version, hash: after.skills.alpha.hash, installed: after.skills.alpha.installed, agents: after.skills.alpha.agents }).toEqual(legacy);
      expect(after.skills.alpha.targets).toBeUndefined();
      expect(after.skills.alpha.tuiTargets).toBeUndefined();
      const status = spawnSync("bun", ["run", CLI, "status"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(status.status).toBe(0);
      expect(status.stdout).toContain("pi ownership unknown");
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("scriptable force removal drops a targetless entry once its copy is removed", () => {
    const f = scopeFixture();
    try {
      const lockFile = join(f.project, ".grimoire-lock.json");
      seedLegacyEntry(lockFile);
      expect(existsSync(f.projectDest)).toBe(true);
      const removed = spawnSync("bun", ["run", CLI, "remove", "alpha", "--force"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(removed.status).toBe(0);
      expect(existsSync(f.projectDest)).toBe(false);
      const after = JSON.parse(readFileSync(lockFile, "utf8"));
      expect(after.skills.alpha).toBeUndefined();
      const status = spawnSync("bun", ["run", CLI, "status"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(status.status).toBe(0);
      expect(status.stdout).toContain("No tracked project installations.");
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("scriptable global force removal preserves a legacy entry while a project copy survives", () => {
    const f = scopeFixture();
    try {
      const lockFile = join(f.project, ".grimoire-lock.json");
      const legacy = seedLegacyEntry(lockFile);
      const removed = spawnSync("bun", ["run", CLI, "remove", "alpha", "--global", "--force"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(removed.status).toBe(0);
      expect(existsSync(f.globalDest)).toBe(false);
      expect(existsSync(f.projectDest)).toBe(true);
      const after = JSON.parse(readFileSync(lockFile, "utf8"));
      expect({ version: after.skills.alpha.version, hash: after.skills.alpha.hash, installed: after.skills.alpha.installed, agents: after.skills.alpha.agents }).toEqual(legacy);
      const status = spawnSync("bun", ["run", CLI, "status"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(status.status).toBe(0);
      expect(status.stdout).toContain("alpha [pi]");
      const project = spawnSync("bun", ["run", CLI, "remove", "alpha", "--force"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(project.status).toBe(0);
      expect(existsSync(f.projectDest)).toBe(false);
      expect(JSON.parse(readFileSync(lockFile, "utf8")).skills.alpha).toBeUndefined();
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("scriptable force removal drops a stale-claim targetless entry once its copy is removed", () => {
    const f = scopeFixture();
    try {
      const lockFile = join(f.project, ".grimoire-lock.json");
      seedLegacyEntry(lockFile, { legacyAgents: ["pi"] });
      expect(existsSync(f.projectDest)).toBe(true);
      const removed = spawnSync("bun", ["run", CLI, "remove", "alpha", "--force"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(removed.status).toBe(0);
      expect(existsSync(f.projectDest)).toBe(false);
      const after = JSON.parse(readFileSync(lockFile, "utf8"));
      expect(after.skills.alpha).toBeUndefined();
      const status = spawnSync("bun", ["run", CLI, "status"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(status.status).toBe(0);
      expect(status.stdout).toContain("No tracked project installations.");
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("scriptable remove preserves a scoped legacy entry while an inspectable copy survives", () => {
    const f = scopeFixture();
    try {
      const lockFile = join(f.project, ".grimoire-lock.json");
      const lock = JSON.parse(readFileSync(lockFile, "utf8"));
      delete lock.skills.alpha.tuiTargets["pi:global"];
      lock.skills.alpha.legacyAgents = ["pi"];
      writeFileSync(lockFile, JSON.stringify(lock, null, 2));
      const removed = spawnSync("bun", ["run", CLI, "remove", "alpha", "--force"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(removed.status).toBe(0);
      expect(existsSync(f.projectDest)).toBe(false);
      expect(existsSync(f.globalDest)).toBe(true);
      const after = JSON.parse(readFileSync(lockFile, "utf8"));
      expect(after.skills.alpha.version).toBe("1.0.0");
      expect(after.skills.alpha.agents).toEqual(["pi"]);
      expect(after.skills.alpha.tuiTargets).toBeUndefined();
      expect(after.skills.alpha.targets).toBeUndefined();
      expect(after.skills.alpha.legacyAgents).toBeUndefined();
      const status = spawnSync("bun", ["run", CLI, "status"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(status.status).toBe(0);
      expect(status.stdout).toContain("alpha [pi]");
      expect(status.stdout).toContain("pi ownership unknown");
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("scriptable remove prunes a scoped legacy entry once no inspectable copy survives", () => {
    const f = scopeFixture();
    try {
      const lockFile = join(f.project, ".grimoire-lock.json");
      const lock = JSON.parse(readFileSync(lockFile, "utf8"));
      delete lock.skills.alpha.tuiTargets["pi:global"];
      lock.skills.alpha.legacyAgents = ["pi"];
      writeFileSync(lockFile, JSON.stringify(lock, null, 2));
      rmSync(f.globalDest, { recursive: true, force: true });
      const removed = spawnSync("bun", ["run", CLI, "remove", "alpha", "--force"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(removed.status).toBe(0);
      expect(existsSync(f.projectDest)).toBe(false);
      expect(existsSync(f.globalDest)).toBe(false);
      const after = JSON.parse(readFileSync(lockFile, "utf8"));
      expect(after.skills.alpha).toBeUndefined();
      const status = spawnSync("bun", ["run", CLI, "status"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(status.status).toBe(0);
      expect(status.stdout).toContain("No tracked project installations.");
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("scriptable remove prunes a dead targets slot when no inspectable copy survives", () => {
    const f = scopeFixture();
    try {
      const lockFile = join(f.project, ".grimoire-lock.json");
      const lock = JSON.parse(readFileSync(lockFile, "utf8"));
      delete lock.skills.alpha.tuiTargets["pi:global"];
      lock.skills.alpha.legacyAgents = ["pi"];
      lock.skills.alpha.targets = { pi: join(f.root, "moved", "alpha") };
      writeFileSync(lockFile, JSON.stringify(lock, null, 2));
      rmSync(f.globalDest, { recursive: true, force: true });
      const removed = spawnSync("bun", ["run", CLI, "remove", "alpha", "--force"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(removed.status).toBe(0);
      expect(existsSync(f.projectDest)).toBe(false);
      const after = JSON.parse(readFileSync(lockFile, "utf8"));
      expect(after.skills.alpha).toBeUndefined();
      const status = spawnSync("bun", ["run", CLI, "status"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(status.status).toBe(0);
      expect(status.stdout).toContain("No tracked project installations.");
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("scriptable remove prunes a dangling sibling scope record when no inspectable copy survives", () => {
    const f = scopeFixture();
    try {
      const lockFile = join(f.project, ".grimoire-lock.json");
      const lock = JSON.parse(readFileSync(lockFile, "utf8"));
      lock.skills.alpha.legacyAgents = ["pi"];
      writeFileSync(lockFile, JSON.stringify(lock, null, 2));
      rmSync(f.globalDest, { recursive: true, force: true });
      const removed = spawnSync("bun", ["run", CLI, "remove", "alpha", "--force"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(removed.status).toBe(0);
      expect(existsSync(f.projectDest)).toBe(false);
      expect(existsSync(f.globalDest)).toBe(false);
      const after = JSON.parse(readFileSync(lockFile, "utf8"));
      expect(after.skills.alpha).toBeUndefined();
      const status = spawnSync("bun", ["run", CLI, "status"], { cwd: f.project, encoding: "utf8", env: f.env });
      expect(status.status).toBe(0);
      expect(status.stdout).toContain("No tracked project installations.");
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  test("remote install preserves TUI scope ownership records", async () => {
    const root = mkdtempSync(join(tmpdir(), "grimoire-remote-lock-"));
    const bytes = Buffer.from("remote skill bytes!");
    const skill = {
      id: "test-skill", name: "Test Skill", version: "2.0.0", category: "test", description: "A test skill", license: "MIT",
      attribution: [{ name: "Test", text: "Test skill", url: "https://example.com" }], entrypoint: "SKILL.md",
      files: [{ path: "SKILL.md", size: bytes.length, sha256: sha256(bytes) }],
      contentSha256: sha256(Buffer.concat([Buffer.from("SKILL.md"), Buffer.from([0]), bytes])),
    };
    const registry = { schemaVersion: 1, catalogVersion: "1.0.0", revision: "rev-test-1", generatedAt: new Date().toISOString(), skills: [skill] };
    mkdirSync(join(root, "cache", "runecraft", "grimoire"), { recursive: true });
    writeFileSync(join(root, "cache", "runecraft", "grimoire", "registry.json"), JSON.stringify({ registry, checkedAt: Date.now() }));
    const server = createServer((req, res) => {
      if (req.url === "/skills/test-skill/SKILL.md") { res.writeHead(200); res.end(bytes); return; }
      if (req.url === "/registry.json") { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(registry)); return; }
      res.writeHead(404); res.end();
    });
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    try {
      const port = (server.address() as { port: number }).port;
      const dest = join(root, ".pi", "skills", "test-skill");
      const record = { destination: dest, scope: "project", files: { "SKILL.md": sha256("seeded bytes") }, identity: "test-skill" };
      writeFileSync(join(root, ".grimoire-lock.json"), JSON.stringify({
        version: 2, generated: new Date().toISOString(), registry: "runecraftai/grimoire", catalogUrl: "", catalogId: "runecraftai/skills", revision: "local",
        skills: { "test-skill": { version: "1.0.0", hash: "sha256:old", installed: new Date().toISOString(), agents: ["pi"], targets: { pi: dest }, tuiTargets: { "pi:project": record } } },
      }, null, 2));
      const exitCode = await new Promise<number | null>((done) => {
        const child = spawn("bun", ["run", CLI, "install", "test-skill", "--target", "pi"], {
          cwd: root,
          env: { ...process.env, XDG_CACHE_HOME: join(root, "cache"), GRIMOIRE_CATALOG_URL: `http://127.0.0.1:${port}/registry.json` },
          stdio: ["ignore", "pipe", "pipe"],
        });
        child.on("close", (code) => done(code));
      });
      expect(exitCode).toBe(0);
      const lock = JSON.parse(readFileSync(join(root, ".grimoire-lock.json"), "utf8"));
      expect(lock.skills["test-skill"].tuiTargets["pi:project"]).toEqual(record);
      expect(lock.skills["test-skill"].version).toBe("2.0.0");
      expect(lock.skills["test-skill"].targets.pi).toBe(dest);
    } finally { server.close(); rmSync(root, { recursive: true, force: true }); }
  });
});
