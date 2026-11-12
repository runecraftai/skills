import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

test("skill-forge executes good/bad mechanism fixtures and bounded failures", () => {
  const validator = fileURLToPath(new URL("../skills/skill-forge/scripts/validate.py", import.meta.url));
  const result = spawnSync("python3", ["-B", validator, "--self-test"], {
    encoding: "utf8",
    timeout: 30_000,
  });
  expect(result.error).toBeUndefined();
  expect(result.status, result.stdout + result.stderr).toBe(0);
}, 35_000);

test("candidate trigger collision is detected against the real published registry", () => {
  const validator = fileURLToPath(new URL("../skills/skill-forge/scripts/validate.py", import.meta.url));
  const good = fileURLToPath(new URL("../skills/skill-forge/assets/fixtures/good-skill", import.meta.url));
  const catalog = fileURLToPath(new URL("../catalog/v1/registry.json", import.meta.url));
  const result = spawnSync("python3", ["-B", validator, good, "--catalog", catalog, "--format", "json"], {
    encoding: "utf8", timeout: 10_000,
  });
  expect(result.status, result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.checks).toContainEqual({
    name: "trigger_collision:skill-forge",
    passed: false,
    severity: "warning",
    message: "good-skill overlaps skill-forge: /forge",
  });
});

test("catalog check rejects new findings, accepts exact baseline, and rejects stale entries", () => {
  const temp = mkdtempSync(join(tmpdir(), "forge-catalog-"));
  try {
    const fixtures = fileURLToPath(new URL("../skills/skill-forge/assets/fixtures/good-skill", import.meta.url));
    const skill = join(temp, "good-skill");
    cpSync(fixtures, skill, { recursive: true });
    const baseline = join(temp, "baseline.json");
    const checker = fileURLToPath(new URL("../scripts/validate-skills.py", import.meta.url));
    const run = () => spawnSync("python3", ["-B", checker, "--skills-root", temp, "--baseline", baseline], {
      encoding: "utf8", timeout: 20_000,
    });
    writeFileSync(baseline, JSON.stringify({ errors: {} }));
    expect(run().status).toBe(0);
    const doc = join(skill, "SKILL.md");
    const original = readFileSync(doc, "utf8");
    writeFileSync(doc, original + "\nRead `references/absent.md`.\n");
    const regression = run();
    expect(regression.status).toBe(1);
    expect(regression.stderr).toContain("good-skill: forward_link:SKILL.md:references/absent.md");
    writeFileSync(baseline, JSON.stringify({ errors: { "good-skill": ["forward_link:SKILL.md:references/absent.md"] } }));
    expect(run().status).toBe(0);
    writeFileSync(doc, original);
    const stale = run();
    expect(stale.status).toBe(1);
    expect(stale.stderr).toContain("Stale baseline: good-skill:");
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}, 35_000);
