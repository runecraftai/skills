import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../skills/feature-parity/scripts/feature-parity.ts", import.meta.url));
const HEADER = "id,feature,priority,status,evidence,notes\n";

function run(csv: string, args: string[] = []) {
  const dir = mkdtempSync(join(tmpdir(), "feature-parity-"));
  try {
    const ledger = join(dir, "features.csv");
    writeFileSync(ledger, csv);
    return spawnSync(process.execPath, [script, ledger, ...args], { encoding: "utf8", timeout: 10_000 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("a ledger with one missing must-have exits 1", () => {
  const result = run(HEADER + "f1,Login,must,yes,tests/login.test.ts,\nf2,Export,must,no,,\n");
  expect(result.status, result.stdout + result.stderr).toBe(1);
});

test("priority=critical exits 2 instead of being scored as nice", () => {
  const result = run(HEADER + "f1,Login,critical,no,,\n");
  expect(result.status, result.stdout + result.stderr).toBe(2);
});

test("all must-haves yes exits 0 and reports shippable", () => {
  const result = run(HEADER + "f1,Login,must,yes,tests/login.test.ts,\nf2,Export,should,partial,,\n");
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(result.stdout).toContain("shippable (exit 0)");
});

test("partial and skipped must-haves do not pass the gate", () => {
  expect(run(HEADER + "f1,Login,must,partial,,\n").status).toBe(1);
  expect(run(HEADER + "f1,Login,must,skip,,out of scope\n").status).toBe(1);
});

test("unknown status exits 2 and is not scored", () => {
  const result = run(HEADER + "f1,Login,must,done,,\n");
  expect(result.status, result.stdout + result.stderr).toBe(2);
  expect(result.stdout).toContain('unknown status "done"');
});

test("skip without a reason in notes exits 2", () => {
  const result = run(HEADER + "f1,Login,nice,skip,,\n");
  expect(result.status, result.stdout + result.stderr).toBe(2);
  expect(result.stdout).toContain("skip requires a reason");
});

test("skip with a reason is listed and excluded from the score", () => {
  const result = run(HEADER + "f1,Login,must,yes,,\nf2,Admin console,nice,skip,,beyond the rebuild target\nf3,Export,should,no,,\n");
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(result.stdout).toContain("Reproduced 1 of 2 scored features (50%)");
  expect(result.stdout).toContain("### Not scored (skip)");
  expect(result.stdout).toContain("`f2` Admin console: beyond the rebuild target");
});

test("an invalid priority wins over a missing must-have", () => {
  const result = run(HEADER + "f1,Export,must,no,,\nf2,Login,critical,yes,,\n");
  expect(result.status, result.stdout + result.stderr).toBe(2);
});

test("json output carries the verdict, missing must-haves, and exit code", () => {
  const result = run(HEADER + "f1,Export,must,no,,\n", ["--format", "json"]);
  expect(result.status).toBe(1);
  const report = JSON.parse(result.stdout);
  expect(report.verdict).toBe("fail");
  expect(report.exitCode).toBe(1);
  expect(report.missingMust).toEqual([{ id: "f1", feature: "Export", status: "no" }]);
});

test("quoted fields may contain commas, quotes, and newlines", () => {
  const csv = `${HEADER}f1,"Export, CSV",must,yes,"see ""notes""","line one
line two"
`;
  const result = run(csv, ["--format", "json"]);
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(JSON.parse(result.stdout).coverage.yes).toBe(1);
});

test("a missing column, an empty ledger, or a missing file exits 2", () => {
  expect(run("id,feature,priority,status\nf1,Login,must,yes\n").status).toBe(2);
  expect(run(HEADER).status).toBe(2);
  const missing = spawnSync(process.execPath, [script, join(tmpdir(), "no-such-feature-parity.csv")], { encoding: "utf8" });
  expect(missing.status).toBe(2);
});

test("an unknown option exits 2", () => {
  const result = run(HEADER + "f1,Login,must,yes,,\n", ["--strict-mode"]);
  expect(result.status).toBe(2);
});
