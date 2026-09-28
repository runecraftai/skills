import { expect, test } from "bun:test";
import { createTestRenderer } from "@opentui/core/testing";
import { createRoot } from "@opentui/react";
import { createElement } from "react";
import { buildTuiFrame, clampPreviewOffset, confirmGateNotice, confirmReviewFits } from "../src/tui.js";

function frame(width: number, height: number, pane: "list" | "preview" = "list") {
  return buildTuiFrame({
    width, height, query: "", target: "codex", scope: "project", pane, mode: "normal",
    skills: [
      { id: "spec-driven", name: "spec-driven", category: "Planning", status: "managed-clean", selected: false },
      { id: "test-driven-development", name: "test-driven-development", category: "Development", status: "absent", selected: true },
    ],
    categories: [{ name: "Development", count: 1 }, { name: "Planning", count: 1 }],
    highlighted: "test-driven-development", description: "A workflow with a long description that must wrap inside the preview column without overrunning the outer frame.",
    status: "absent", tags: [], trigger: "/test", files: ["references/testing-patterns.md"],
    content: "# Test Driven Development\nWrite a failing test first, then implement the smallest change. This deliberately long sentence verifies that the skill body wraps to the pane width instead of colliding with the footer.",
    previewOffset: 0, notice: [],
  });
}

test("frame keeps borders, footer, and exact height at every accepted size", () => {
  for (const [width, height] of [[40, 12], [48, 16], [56, 12], [60, 10], [79, 12], [80, 11], [80, 12], [80, 24]] as const) {
    const lines = frame(width, height);
    expect(lines).toHaveLength(height);
    expect(lines.every((line) => Array.from(line).length === width)).toBe(true);
    expect(lines[0].startsWith("┌")).toBe(true);
    expect(lines.at(-1)?.startsWith("└")).toBe(true);
    const text = lines.join("\n");
    expect(text).toContain("Space select");
    expect(text).toContain("q quit");
    expect(text).toContain("target: codex");
  }
});

test("frame strips terminal control sequences from skill metadata and notices", () => {
  const lines = buildTuiFrame({
    width: 80, height: 24, query: "", target: "pi", scope: "project", pane: "preview", mode: "normal",
    skills: [{ id: "evil", name: "evil\u001b[2Jskill", category: "Cat\u001b]0;pwn\u0007", status: "absent", selected: false }],
    categories: [{ name: "Cat\u001b]0;pwn\u0007", count: 1 }],
    highlighted: "evil", description: "plain \u001b[31mdescription\u001b[0m here", status: "absent",
    tags: ["tag\u001b[2J"], trigger: "/trig\u001b[H", files: ["ref\u001b[2J.md"],
    content: "body\u001b[2Ktext", previewOffset: 0, notice: ["notice \u001b[H \u0007line"],
  });
  const text = lines.join("\n");
  expect(text).not.toContain("\u001b");
  expect(text).not.toContain("\u0007");
  expect(text).toContain("evilskill");
  expect(text).toContain("plain description here");
});

test("confirm review renders its prompt, separator, and skill body at the gate minimum", () => {
  const prompt = "INSTALL test-driven-development → pi · project? Enter/y confirms; Esc/n cancels.";
  for (const height of [16, 18, 24]) {
    const lines = buildTuiFrame({
      width: 80, height, query: "", target: "pi", scope: "project", pane: "preview", mode: "confirm",
      skills: [
        { id: "spec-driven", name: "spec-driven", category: "Planning", status: "managed-clean", selected: false },
        { id: "test-driven-development", name: "test-driven-development", category: "Development", status: "absent", selected: true },
      ],
      categories: [{ name: "Development", count: 1 }, { name: "Planning", count: 1 }],
      highlighted: "test-driven-development", description: "A workflow description for the preview pane.",
      status: "absent", tags: [], trigger: "/test", files: ["references/testing-patterns.md"],
      content: "# Test Driven Development\nWrite a failing test first, then implement.", previewOffset: 0, notice: [prompt],
    });
    const text = lines.join("\n");
    expect(lines).toHaveLength(height);
    expect(lines.at(-1)?.startsWith("└")).toBe(true);
    expect(text).toContain("INSTALL test-driven-development");
    expect(text).toContain("cancels.");
    expect(text).toContain("# Test Driven Development");
    expect(lines.some((line) => line.startsWith("│") && /[─]{15,}│$/.test(line))).toBe(true);
  }
});

test("required description, trigger, and file index are funded before optional status", () => {
  const text = frame(80, 16).join("\n");
  expect(text).toContain("A workflow with a long description");
  expect(text).toContain("Trigger");
  expect(text).toContain("SKILL.md");
  expect(text).not.toContain("Status:");
});

test("notice feedback stays visible at the minimum sizes", () => {
  const notice = ["Lockfile error — mutations disabled: malformed lockfile"];
  const build = (width: number, height: number) => buildTuiFrame({
    width, height, query: "", target: "pi", scope: "project", pane: "list", mode: "normal",
    skills: [{ id: "spec-driven", name: "spec-driven", category: "Planning", status: "absent", selected: false }],
    categories: [{ name: "Planning", count: 1 }], highlighted: "spec-driven", description: "", status: "absent",
    tags: [], trigger: "", files: [], content: "", previewOffset: 0, notice,
  });
  expect(build(40, 12).join("\n")).toContain("Lockfile error");
  expect(build(80, 12).join("\n")).toContain("Lockfile error");
});

test("confirm gate counts lockfile error rows and reports the true blocker", () => {
  const action = "install" as const, ids = ["test-driven-development"], dest = "pi · project";
  expect(confirmReviewFits(action, ids, dest, 80, 16)).toBe(true);
  expect(confirmReviewFits(action, ids, dest, 80, 16, "malformed lockfile")).toBe(false);
  expect(confirmGateNotice(action, ids, dest, 80, 16)).toBeNull();
  expect(confirmGateNotice(action, ids, dest, 79, 16)).toContain("Resize to at least 80x16");
  expect(confirmGateNotice(action, ids, dest, 80, 16, "malformed lockfile")).toContain("Not enough room");
});

test("preview offset past the body is clamped to real content instead of an empty region", () => {
  const lines = buildTuiFrame({
    width: 80, height: 24, query: "", target: "pi", scope: "project", pane: "preview", mode: "normal",
    skills: [{ id: "spec-driven", name: "spec-driven", category: "Planning", status: "absent", selected: false }],
    categories: [{ name: "Planning", count: 1 }], highlighted: "spec-driven", description: "short", status: "absent",
    tags: [], trigger: "/spec", files: [], content: "alpha\nbeta\ngamma\ndelta", previewOffset: 100_000, notice: [],
  });
  expect(lines).toHaveLength(24);
  expect(lines.join("\n")).toContain("delta");
});

test("preview scroll reports its rendered bound so page-up always moves", () => {
  const model = {
    width: 80, height: 24, query: "", target: "pi", scope: "project", pane: "preview" as const, mode: "normal" as const,
    skills: [{ id: "spec-driven", name: "spec-driven", category: "Planning", status: "absent", selected: false }],
    categories: [{ name: "Planning", count: 1 }], highlighted: "spec-driven", description: "short", status: "absent",
    tags: [], trigger: "/spec", files: [], content: Array.from({ length: 60 }, (_, i) => `body line ${i}`).join("\n"),
    previewOffset: 100_000, notice: [] as string[],
  };
  const bounds = { previewMax: -1 };
  expect(buildTuiFrame(model, bounds)).toHaveLength(24);
  expect(bounds.previewMax).toBeGreaterThan(0);
  expect(clampPreviewOffset(100_000, bounds.previewMax)).toBe(bounds.previewMax);
  expect(clampPreviewOffset(bounds.previewMax - 12, bounds.previewMax)).toBeLessThan(bounds.previewMax);
  const shortBounds = { previewMax: -1 };
  buildTuiFrame({ ...model, content: "alpha\nbeta\ngamma\ndelta", previewOffset: 100_000 }, shortBounds);
  expect(shortBounds.previewMax).toBe(0);
  expect(clampPreviewOffset(100_000, shortBounds.previewMax)).toBe(0);
});

test("carriage returns never reach the rendered frame rows", () => {
  const lines = buildTuiFrame({
    width: 80, height: 24, query: "", target: "pi", scope: "project", pane: "preview", mode: "normal",
    skills: [{ id: "evil", name: "evil\rname", category: "Cat", status: "absent", selected: false }],
    categories: [{ name: "Cat", count: 1 }], highlighted: "evil", description: "desc\rmore", status: "absent",
    tags: [], trigger: "/trig", files: [], content: "one\r\ntwo", previewOffset: 0, notice: ["bad\rnotice"],
  });
  expect(lines).toHaveLength(24);
  expect(lines.every((line) => Array.from(line).length === 80)).toBe(true);
  expect(lines.join("\n")).not.toContain("\r");
});

test("narrow list pane keeps feedback notices visible with a full catalog", () => {
  const skills = Array.from({ length: 30 }, (_, index) => ({ id: `skill-${index}`, name: `skill-${index}`, category: "Cat", status: "absent", selected: false }));
  const lines = buildTuiFrame({
    width: 60, height: 16, query: "", target: "pi", scope: "project", pane: "list", mode: "normal",
    skills, categories: [{ name: "Cat", count: 30 }], highlighted: "skill-15",
    description: "", status: "absent", tags: [], trigger: "", files: [], content: "",
    previewOffset: 0, notice: ["Resize to at least 80x16 to review this action safely; nothing changed."],
  });
  expect(lines).toHaveLength(16);
  expect(lines.at(-1)?.startsWith("└")).toBe(true);
  expect(lines.join("\n")).toContain("Resize to at least 80x16");
});

test("80x24 and narrow frames keep the runic header, split pane, target, and footer within bounds", async () => {
  const wide = frame(80, 24);
  const narrow = frame(48, 16);
  for (const [lines, width, height] of [[wide, 80, 24], [narrow, 48, 16]] as const) {
    expect(lines).toHaveLength(height);
    expect(lines.every((line) => Array.from(line).length === width)).toBe(true);
    expect(lines[0].startsWith("┌")).toBe(true);
    expect(lines.at(-1)?.startsWith("└")).toBe(true);
    expect(lines.join("\n")).toContain("target: codex");
    expect(lines.join("\n")).toContain("q quit");
    expect(lines.join("\n")).toContain("Space select");
  }
  expect(wide.some((line) => line.includes("┬"))).toBe(true);
  expect(wide.some((line) => line.includes("ᛝ"))).toBe(true);
  expect(wide.some((line) => line.includes("██╔════╝"))).toBe(true);
  const art = [
    "ᛝ  ██████╗ ██████╗ ██╗███╗   ███╗ ██████╗ ██╗██████╗ ███████╗  ᛝ",
    "   ██╔════╝ ██╔══██╗██║████╗ ████║██╔═══██╗██║██╔══██╗██╔════╝",
    "   ██║  ███╗██████╔╝██║██╔████╔██║██║   ██║██║██████╔╝█████╗",
    "   ██║   ██║██╔══██╗██║██║╚██╔╝██║██║   ██║██║██╔══██╗██╔══╝",
    "   ╚██████╔╝██║  ██║██║██║ ╚═╝ ██║╚██████╔╝██║██║  ██║███████╗",
    "    ╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝     ╚═╝ ╚═════╝ ╚═╝╚═╝  ╚═╝╚══════╝",
  ];
  const artWidth = Math.max(...art.map((row) => row.length));
  const offset = Math.floor((78 - artWidth) / 2);
  expect(wide.slice(1, 7).map((line) => line.slice(1 + offset, 1 + offset + artWidth)))
    .toEqual(art.map((row) => row.padEnd(artWidth)));
  expect(narrow.join("\n")).toContain("╔═╗╦═╗╦╔╦╗╔═╗╦╦═╗╔═╗");
  expect(narrow.join("\n")).toContain("║ ╦╠╦╝║║║║║ ║║╠╦╝║╣");
  expect(narrow.join("\n")).toContain("╚═╝╩╚═╩╩ ╩╚═╝╩╩╚═╚═╝");
  expect(wide.join("\n")).toContain("●◉ test-driven-development");
  expect(wide.join("\n")).toContain("○ spec-driven");

  const screen = await createTestRenderer({ width: 80, height: 24 });
  const root = createRoot(screen.renderer);
  try {
    root.render(createElement("text", { width: 80, height: 24, wrapMode: "none" }, wide.join("\n")));
    screen.renderer.start();
    await screen.renderOnce();
    await screen.flush();
    expect(screen.captureCharFrame()).toContain("┌");
    expect(screen.captureCharFrame()).toContain("target: codex");
    screen.resize(48, 16);
    root.render(createElement("text", { width: 48, height: 16, wrapMode: "none" }, narrow.join("\n")));
    await screen.renderOnce();
    await screen.flush();
    expect(screen.captureCharFrame()).toContain("q quit");
    expect(screen.captureCharFrame()).toContain("└");
  } finally { root.unmount(); screen.renderer.destroy(); }
});
