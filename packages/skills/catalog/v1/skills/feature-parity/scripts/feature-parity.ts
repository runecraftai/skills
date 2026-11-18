#!/usr/bin/env bun
// Scores a feature-parity ledger (features.csv) and gates on must-have features.
// Exit codes: 0 = all must-haves are yes; 1 = a must-have is not yes; 2 = invalid ledger or usage.
import { readFileSync } from "node:fs";

const COLUMNS = ["id", "feature", "priority", "status", "evidence", "notes"];
const PRIORITIES = ["must", "should", "nice"] as const;
const STATUSES = ["yes", "partial", "no", "skip"];

type Priority = (typeof PRIORITIES)[number];
type Row = Record<string, string>;

interface Coverage {
  scored: number;
  yes: number;
  percent: number | null;
  byPriority: Record<Priority, { scored: number; yes: number }>;
}

interface Report {
  verdict: "pass" | "fail" | "invalid";
  exitCode: 0 | 1 | 2;
  errors: string[];
  coverage: Coverage | null;
  missingMust: { id: string; feature: string; status: string }[];
  notScored: { id: string; feature: string; priority: string; notes: string }[];
}

const USAGE = `Usage: feature-parity.ts [features.csv] [--format md|json] [--self-test]

Columns: id,feature,priority(must|should|nice),status(yes|partial|no|skip),evidence,notes
Exit: 0 shippable, 1 a must-have is not yes, 2 invalid ledger or usage.
A skip row needs a reason in notes; skip rows are listed but not scored.
--self-test runs the in-process assertions for the gate and exits 0 only if all hold.
`;

// RFC 4180-style parser: quoted fields may contain commas, newlines, and doubled quotes.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') field += c;
      else if (text[i + 1] === '"') { field += '"'; i++; }
      else quoted = false;
    } else if (c === '"' && field === "") {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (quoted) throw new Error("unterminated quoted field");
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

function evaluate(text: string): Report {
  const invalid = (errors: string[]): Report => ({ verdict: "invalid", exitCode: 2, errors, coverage: null, missingMust: [], notScored: [] });

  let table: string[][];
  try {
    table = parseCsv(text);
  } catch (error) {
    return invalid([`malformed CSV: ${(error as Error).message}`]);
  }
  const names = (table[0] ?? []).map((name) => name.trim());
  const missingColumns = COLUMNS.filter((column) => !names.includes(column));
  if (missingColumns.length > 0) return invalid([`missing columns: ${missingColumns.join(", ")}`]);
  const body = table.slice(1);
  if (body.length === 0) return invalid(["ledger has no feature rows"]);

  const errors: string[] = [];
  const rows: Row[] = [];
  body.forEach((fields, index) => {
    if (fields.length !== names.length) {
      errors.push(`row ${index + 1}: expected ${names.length} fields, found ${fields.length}`);
      return;
    }
    const row: Row = Object.fromEntries(names.map((name, i) => [name, fields[i].trim()]));
    const label = `row ${index + 1} (${row.id || "no id"})`;
    if (!(PRIORITIES as readonly string[]).includes(row.priority)) errors.push(`${label}: unknown priority "${row.priority}"`);
    if (!STATUSES.includes(row.status)) errors.push(`${label}: unknown status "${row.status}"`);
    if (row.status === "skip" && row.notes === "") errors.push(`${label}: skip requires a reason in notes`);
    rows.push(row);
  });
  if (errors.length > 0) return invalid(errors);

  const coverage: Coverage = {
    scored: 0,
    yes: 0,
    percent: null,
    byPriority: { must: { scored: 0, yes: 0 }, should: { scored: 0, yes: 0 }, nice: { scored: 0, yes: 0 } },
  };
  const missingMust: Report["missingMust"] = [];
  const notScored: Report["notScored"] = [];
  for (const row of rows) {
    const priority = row.priority as Priority;
    // A must-have can never be waived by skip: only status=yes passes the gate.
    if (priority === "must" && row.status !== "yes") missingMust.push({ id: row.id, feature: row.feature, status: row.status });
    if (row.status === "skip") {
      notScored.push({ id: row.id, feature: row.feature, priority, notes: row.notes });
      continue;
    }
    coverage.scored++;
    coverage.byPriority[priority].scored++;
    if (row.status === "yes") {
      coverage.yes++;
      coverage.byPriority[priority].yes++;
    }
  }
  if (coverage.scored > 0) coverage.percent = Math.round((coverage.yes / coverage.scored) * 1000) / 10;

  const pass = missingMust.length === 0;
  return { verdict: pass ? "pass" : "fail", exitCode: pass ? 0 : 1, errors: [], coverage, missingMust, notScored };
}

function toMarkdown(report: Report): string {
  if (report.verdict === "invalid" || report.coverage === null) {
    return ["## Feature parity: invalid ledger (exit 2)", "", ...report.errors.map((e) => `- ${e}`), ""].join("\n");
  }
  const c = report.coverage;
  const lines = [
    `## Feature parity: ${report.verdict === "pass" ? "shippable" : "not shippable"} (exit ${report.exitCode})`,
    "",
    `Reproduced ${c.yes} of ${c.scored} scored features${c.percent === null ? "" : ` (${c.percent}%)`}.`,
    "",
    "| Priority | Scored | Yes |",
    "| --- | --- | --- |",
    ...PRIORITIES.map((p) => `| ${p} | ${c.byPriority[p].scored} | ${c.byPriority[p].yes} |`),
  ];
  if (report.missingMust.length > 0) {
    lines.push("", "### Missing must-haves", "", ...report.missingMust.map((m) => `- \`${m.id}\` ${m.feature} (${m.status})`));
  }
  if (report.notScored.length > 0) {
    lines.push("", "### Not scored (skip)", "", ...report.notScored.map((n) => `- \`${n.id}\` ${n.feature}: ${n.notes}`));
  }
  return `${lines.join("\n")}\n`;
}

const SELF_TESTS: { assertion: string; ledger: string; exitCode: number }[] = [
  {
    assertion: "a ledger whose must-haves are all yes exits 0",
    ledger: "id,feature,priority,status,evidence,notes\nf1,Login,must,yes,tests/login.test.ts,\nf2,Export,should,partial,,\n",
    exitCode: 0,
  },
  {
    assertion: "a ledger with one missing must-have exits 1",
    ledger: "id,feature,priority,status,evidence,notes\nf1,Login,must,yes,,\nf2,Export,must,no,,\n",
    exitCode: 1,
  },
  {
    assertion: "an unknown status exits 2",
    ledger: "id,feature,priority,status,evidence,notes\nf1,Login,must,done,,\n",
    exitCode: 2,
  },
  {
    assertion: "priority=critical exits 2",
    ledger: "id,feature,priority,status,evidence,notes\nf1,Login,critical,no,,\n",
    exitCode: 2,
  },
];

function selfTest(): number {
  const failures: string[] = [];
  for (const test of SELF_TESTS) {
    const { exitCode } = evaluate(test.ledger);
    if (exitCode !== test.exitCode) failures.push(`${test.assertion}: expected exit ${test.exitCode}, got ${exitCode}`);
  }
  if (failures.length > 0) {
    process.stderr.write(`feature-parity: self-test failed\n${failures.map((failure) => `- ${failure}`).join("\n")}\n`);
    return 1;
  }
  process.stdout.write(`feature-parity: self-test passed (${SELF_TESTS.length} assertions)\n`);
  return 0;
}

function main(args: string[]): number {
  const fail = (message: string): number => {
    process.stderr.write(`feature-parity: ${message}\n${USAGE}`);
    return 2;
  };
  const positional: string[] = [];
  let format = "md";
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") { process.stdout.write(USAGE); return 0; }
    if (arg === "--self-test") return selfTest();
    if (arg === "--format") format = args[++i] ?? "";
    else if (arg.startsWith("-")) return fail(`unknown option ${arg}`);
    else positional.push(arg);
  }
  if (positional.length > 1) return fail("expected at most one ledger path");
  if (format !== "md" && format !== "json") return fail(`unknown format "${format}" (use md or json)`);

  const path = positional[0] ?? "features.csv";
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    return fail(`cannot read ${path}: ${(error as NodeJS.ErrnoException).code ?? "error"}`);
  }
  const report = evaluate(text);
  process.stdout.write(format === "json" ? `${JSON.stringify(report, null, 2)}\n` : toMarkdown(report));
  return report.exitCode;
}

process.exitCode = main(process.argv.slice(2));
