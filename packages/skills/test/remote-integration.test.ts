import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { readLockfile, writeLockfile, updateLock, type Lockfile } from "../src/lockfile.js";
import { loadRemoteCatalog, downloadSkill } from "../src/remote-catalog.js";
import type { Registry, Skill } from "../../core/src/index.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

const registry: Registry = JSON.parse(
  await readFile(new URL("../../skills/catalog/v1/registry.json", import.meta.url), "utf8")
);

const sampleSkill: Skill = {
  id: "test-skill",
  name: "Test Skill",
  version: "1.0.0",
  category: "test",
  description: "A test skill",
  license: "MIT",
  attribution: [{ name: "test", text: "test", url: "https://example.com" }],
  entrypoint: "SKILL.md",
  files: [{ path: "SKILL.md", size: 14, sha256: "2f88b8e0a6b7e1f3d4c5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7" }],
  contentSha256: "4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce",
};

// Build a mock file that matches the sha256 above
function makeSkillFile(): Buffer {
  // We need a 14-byte file whose sha256 is the expected hash.
  // Compute it properly by looking at what downloadSkill expects:
  // The file bytes must match the sha256 in the files array.
  // Since we're mocking the fetcher, we control the bytes.
  // Let's pick a known content and compute its hashes.
  const content = "test skill data!";
  const bytes = Buffer.from(content);
  return bytes;
}

// Compute proper hashes for our test skill
function makeSkillWithHashes(): Skill {
  const content = "test skill data!";
  const bytes = Buffer.from(content);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const contentSha256 = createHash("sha256")
    .update(Buffer.from("SKILL.md"))
    .update(Buffer.from([0]))
    .update(bytes)
    .digest("hex");
  return {
    id: "test-skill",
    name: "Test Skill",
    version: "1.0.0",
    category: "test",
    description: "A test skill for integration testing",
    license: "MIT",
    attribution: [{ name: "test", text: "test", url: "https://example.com" }],
    entrypoint: "SKILL.md",
    files: [{ path: "SKILL.md", size: bytes.length, sha256 }],
    contentSha256,
  };
}

function makeRegistry(skills: Skill[]): Registry {
  return {
    schemaVersion: 1,
    catalogVersion: "1.0.0",
    revision: "test-revision-abc123",
    generatedAt: new Date().toISOString(),
    skills,
  };
}

const skillBytes = Buffer.from("test skill data!");
const testSkill = makeSkillWithHashes();
const testRegistry = makeRegistry([testSkill]);

/** Mock fetcher that serves the registry JSON at the first URL, then skill files */
function mockFetcher(reg: Registry) {
  const skillUrlPattern = /skills\/test-skill\/SKILL\.md/;
  return async (input: any, _init?: any) => {
    const url = typeof input === "string" ? input : input?.url ?? String(input);
    if (skillUrlPattern.test(url)) {
      return new Response(skillBytes, { status: 200 });
    }
    return new Response(JSON.stringify(reg), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}

let dirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "remote-test-"));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs = [];
});

// ─── Lockfile v1→v2 migration ───────────────────────────────────────────────

describe("lockfile migration v1→v2", () => {
  test("reads v1 lock and migrates to v2 without losing tracked installs", () => {
    const dir = tempDir();
    const v1: Lockfile = {
      version: 1 as any,
      generated: "2025-01-01T00:00:00.000Z",
      registry: "runecraftai/grimoire",
      catalogUrl: "",
      catalogId: "runecraftai/skills",
      revision: "legacy",
      skills: {
        "old-skill": {
          version: "0.1.0",
          hash: "sha256:abc123",
          installed: "2025-01-01T00:00:00.000Z",
          agents: ["pi"],
        },
        "another-skill": {
          version: "2.0.0",
          hash: "sha256:def456",
          installed: "2025-06-15T12:00:00.000Z",
          agents: ["pi", "custom"],
        },
      },
    } as any;
    writeFileSync(join(dir, ".grimoire-lock.json"), JSON.stringify(v1, null, 2));

    const read = readLockfile(dir);
    expect(read.version).toBe(2);
    // Both old skills preserved
    expect(Object.keys(read.skills)).toEqual(["old-skill", "another-skill"]);
    expect(read.skills["old-skill"].version).toBe("0.1.0");
    expect(read.skills["old-skill"].agents).toEqual(["pi"]);
    expect(read.skills["another-skill"].agents).toEqual(["pi", "custom"]);
    // Missing v2 fields get defaults
    expect(read.catalogUrl).toBe("");
    expect(read.revision).toBe("legacy");
  });

  test("migrating v1 does not drop skills that have no v2-specific fields", () => {
    const dir = tempDir();
    const v1: Lockfile = {
      version: 1 as any,
      generated: "2025-01-01T00:00:00.000Z",
      registry: "runecraftai/grimoire",
      catalogUrl: "",
      catalogId: "runecraftai/skills",
      revision: "legacy",
      skills: {
        beta: {
          version: "0.1.0",
          hash: "sha256:247e1f7348551bf9ee980f380fe8543ec74b9d920a0eeb9437cadbb9a6d28f8d",
          installed: "2025-01-01T00:00:00.000Z",
          agents: ["custom"],
        },
      },
    } as any;
    writeFileSync(join(dir, ".grimoire-lock.json"), JSON.stringify(v1, null, 2));

    const read = readLockfile(dir);
    expect(read.version).toBe(2);
    expect(Object.keys(read.skills)).toEqual(["beta"]);
    expect(read.skills.beta.hash).toBe("sha256:247e1f7348551bf9ee980f380fe8543ec74b9d920a0eeb9437cadbb9a6d28f8d");
    // Legacy hash retained
    expect(read.skills.beta.hash).toBeTruthy();
    // v2 fields are absent (optional)
    expect(read.skills.beta.contentSha256).toBeUndefined();
    expect(read.skills.beta.fileHashes).toBeUndefined();
  });
});

// ─── Lockfile symlink rejection ─────────────────────────────────────────────

describe("lockfile symlink rejection", () => {
  test("refuses to read a lockfile that is a symlink", () => {
    const dir = tempDir();
    const realLock = join(dir, "real-lock.json");
    const symlinkLock = join(dir, ".grimoire-lock.json");
    writeFileSync(realLock, JSON.stringify({ version: 2, generated: "2025-01-01T00:00:00.000Z", registry: "runecraftai/grimoire", catalogUrl: "", catalogId: "runecraftai/skills", revision: "legacy", skills: {} }));
    symlinkSync(realLock, symlinkLock);

    expect(() => readLockfile(dir)).toThrow("lockfile cannot be a symlink");
  });

  test("refuses to write a lockfile that is a symlink", () => {
    const dir = tempDir();
    const realLock = join(dir, "real-lock.json");
    const symlinkLock = join(dir, ".grimoire-lock.json");
    writeFileSync(realLock, "{}");
    symlinkSync(realLock, symlinkLock);

    const lock: Lockfile = { version: 2, generated: new Date().toISOString(), registry: "runecraftai/grimoire", catalogUrl: "", catalogId: "runecraftai/skills", revision: "legacy", skills: {} };
    expect(() => writeLockfile(dir, lock)).toThrow("lockfile cannot be a symlink");
  });
});

// ─── updateLock preserves existing fields ───────────────────────────────────

describe("updateLock preserves existing fields", () => {
  test("merging into an existing entry retains contentSha256, fileHashes, targets", () => {
    const lock: Lockfile = {
      version: 2, generated: new Date().toISOString(), registry: "runecraftai/grimoire",
      catalogUrl: "https://example.com/reg", catalogId: "test", revision: "rev1",
      skills: {
        "my-skill": {
          version: "1.0.0", hash: "sha256:old", installed: "2025-01-01T00:00:00.000Z", agents: ["pi"],
          contentSha256: "original-content-hash", fileHashes: { "SKILL.md": "original-file-hash" },
          targets: { pi: "/home/user/.pi/skills/my-skill" },
          license: "MIT", attribution: [{ name: "test", text: "test", url: "https://example.com" }],
        },
      },
    };

    updateLock(lock, "my-skill", { version: "1.1.0", hash: "sha256:new", installed: new Date().toISOString(), agents: ["custom"] });

    const entry = lock.skills["my-skill"];
    // New fields merged
    expect(entry.version).toBe("1.1.0");
    expect(entry.hash).toBe("sha256:new");
    expect(entry.agents).toEqual(["pi", "custom"]);
    // Existing v2 fields preserved (not overwritten by spread)
    expect(entry.contentSha256).toBe("original-content-hash");
    expect(entry.fileHashes).toEqual({ "SKILL.md": "original-file-hash" });
    expect(entry.targets).toEqual({ pi: "/home/user/.pi/skills/my-skill" });
    expect(entry.license).toBe("MIT");
    expect(entry.attribution).toHaveLength(1);
  });
});

// ─── loadRemoteCatalog ─────────────────────────────────────────────────────

describe("loadRemoteCatalog", () => {
  test("returns fresh registry from remote fetch", async () => {
    const dir = tempDir();
    const cacheFile = join(dir, "registry.json");
    const result = await loadRemoteCatalog({
      cacheFile,
      fetcher: mockFetcher(testRegistry) as any,
    });
    expect(result.registry.skills).toHaveLength(1);
    expect(result.registry.skills[0].id).toBe("test-skill");
    expect(result.freshness).toBe("fresh");
    expect(result.warning).toBeUndefined();
  });

  test("offline mode reads from cache file", async () => {
    const dir = tempDir();
    const cacheFile = join(dir, "registry.json");
    // Write a valid cache
    writeFileSync(cacheFile, JSON.stringify({ registry: testRegistry, checkedAt: Date.now() }));

    const result = await loadRemoteCatalog({ cacheFile, offline: true });
    expect(result.registry.skills[0].id).toBe("test-skill");
    expect(result.freshness).toBe("offline");
    expect(result.warning).toContain("Offline");
  });

  test("offline mode throws when no cache exists", async () => {
    const dir = tempDir();
    const cacheFile = join(dir, "nonexistent.json");

    await expect(loadRemoteCatalog({ cacheFile, offline: true })).rejects.toThrow("No validated cached catalog available");
  });
});

// ─── downloadSkill ──────────────────────────────────────────────────────────

describe("downloadSkill", () => {
  test("downloads and verifies skill files using mock fetcher", async () => {
    const root = await downloadSkill(testSkill, "https://cdn.example.com/registry.json", mockFetcher(testRegistry) as any);
    try {
      // downloadSkill writes files relative to root (e.g. root/SKILL.md)
      expect(existsSync(join(root, "SKILL.md"))).toBe(true);
      const content = readFileSync(join(root, "SKILL.md"), "utf8");
      expect(content).toBe("test skill data!");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("throws on fetch failure", async () => {
    const badFetcher = async () => new Response("not found", { status: 404 });
    await expect(downloadSkill(testSkill, "https://cdn.example.com/reg.json", badFetcher as any)).rejects.toThrow();
  });

  test("throws on digest mismatch", async () => {
    const tamperedSkill = {
      ...testSkill,
      files: [{ path: "SKILL.md", size: 14, sha256: "0000000000000000000000000000000000000000000000000000000000000000" }],
    };
    const badFetcher = async () => new Response(skillBytes, { status: 200 });
    await expect(downloadSkill(tamperedSkill, "https://cdn.example.com/reg.json", badFetcher as any)).rejects.toThrow("Digest mismatch");
  });
});

// ─── Audit tamper detection (unit-level) ────────────────────────────────────

describe("audit tamper detection", () => {
  test("detects tampered installed bytes via file hash comparison", () => {
    const dir = tempDir();
    const skillDir = join(dir, "skills", "test-skill");
    mkdirSync(skillDir, { recursive: true });
    const originalContent = "original skill content here!!";
    const tamperedContent = "TAMPERED content here!!!!!!!!!";
    writeFileSync(join(skillDir, "SKILL.md"), originalContent);

    const originalHash = createHash("sha256").update(Buffer.from(originalContent)).digest("hex");
    const tamperedHash = createHash("sha256").update(Buffer.from(tamperedContent)).digest("hex");

    const lock: Lockfile = {
      version: 2, generated: new Date().toISOString(), registry: "runecraftai/grimoire",
      catalogUrl: "https://example.com/reg", catalogId: "test", revision: "rev1",
      skills: {
        "test-skill": {
          version: "1.0.0", hash: `sha256:${originalHash}`, installed: new Date().toISOString(),
          agents: ["pi"], contentSha256: "some-hash",
          fileHashes: { "SKILL.md": originalHash },
          targets: { pi: join(skillDir) },
        },
      },
    };
    writeFileSync(join(dir, ".grimoire-lock.json"), JSON.stringify(lock, null, 2));

    // Simulate tampering
    writeFileSync(join(skillDir, "SKILL.md"), tamperedContent);

    // Read lock and perform the same audit logic as the CLI
    const readLock = readLockfile(dir);
    const issues: string[] = [];
    for (const [id, entry] of Object.entries(readLock.skills)) {
      for (const [target, location] of Object.entries(entry.targets ?? {})) {
        for (const [path, expected] of Object.entries(entry.fileHashes ?? {})) {
          try {
            const actual = createHash("sha256").update(readFileSync(join(location, path))).digest("hex");
            if (actual !== expected) issues.push(`${id}/${path}: tampered (${target})`);
          } catch {
            issues.push(`${id}/${path}: missing (${target})`);
          }
        }
      }
    }

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("test-skill/SKILL.md: tampered");
    expect(issues[0]).toContain("pi");
  });

  test("detects missing installed files", () => {
    const dir = tempDir();
    const skillDir = join(dir, "skills", "test-skill");
    mkdirSync(skillDir, { recursive: true });
    // Don't create SKILL.md - it's "missing"

    const hash = createHash("sha256").update(Buffer.from("expected")).digest("hex");

    const lock: Lockfile = {
      version: 2, generated: new Date().toISOString(), registry: "runecraftai/grimoire",
      catalogUrl: "https://example.com/reg", catalogId: "test", revision: "rev1",
      skills: {
        "test-skill": {
          version: "1.0.0", hash: `sha256:${hash}`, installed: new Date().toISOString(),
          agents: ["pi"], contentSha256: "some-hash",
          fileHashes: { "SKILL.md": hash },
          targets: { pi: join(skillDir) },
        },
      },
    };
    writeFileSync(join(dir, ".grimoire-lock.json"), JSON.stringify(lock, null, 2));

    const readLock = readLockfile(dir);
    const issues: string[] = [];
    for (const [id, entry] of Object.entries(readLock.skills)) {
      for (const [target, location] of Object.entries(entry.targets ?? {})) {
        for (const [path, expected] of Object.entries(entry.fileHashes ?? {})) {
          try {
            const actual = createHash("sha256").update(readFileSync(join(location, path))).digest("hex");
            if (actual !== expected) issues.push(`${id}/${path}: tampered (${target})`);
          } catch {
            issues.push(`${id}/${path}: missing (${target})`);
          }
        }
      }
    }

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("test-skill/SKILL.md: missing");
  });

  test("reports no issues for intact installations", () => {
    const dir = tempDir();
    const skillDir = join(dir, "skills", "test-skill");
    mkdirSync(skillDir, { recursive: true });
    const content = "expected content";
    writeFileSync(join(skillDir, "SKILL.md"), content);
    const hash = createHash("sha256").update(Buffer.from(content)).digest("hex");

    const lock: Lockfile = {
      version: 2, generated: new Date().toISOString(), registry: "runecraftai/grimoire",
      catalogUrl: "https://example.com/reg", catalogId: "test", revision: "rev1",
      skills: {
        "test-skill": {
          version: "1.0.0", hash: `sha256:${hash}`, installed: new Date().toISOString(),
          agents: ["pi"], contentSha256: "some-hash",
          fileHashes: { "SKILL.md": hash },
          targets: { pi: join(skillDir) },
        },
      },
    };
    writeFileSync(join(dir, ".grimoire-lock.json"), JSON.stringify(lock, null, 2));

    const readLock = readLockfile(dir);
    const issues: string[] = [];
    for (const [id, entry] of Object.entries(readLock.skills)) {
      for (const [target, location] of Object.entries(entry.targets ?? {})) {
        for (const [path, expected] of Object.entries(entry.fileHashes ?? {})) {
          try {
            const actual = createHash("sha256").update(readFileSync(join(location, path))).digest("hex");
            if (actual !== expected) issues.push(`${id}/${path}: tampered (${target})`);
          } catch {
            issues.push(`${id}/${path}: missing (${target})`);
          }
        }
      }
    }

    expect(issues).toEqual([]);
  });
});
