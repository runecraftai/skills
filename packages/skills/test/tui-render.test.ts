import { expect, test } from "bun:test";
import { createTestRenderer } from "@opentui/core/testing";
import { createRoot } from "@opentui/react";
import { createElement } from "react";
import { buildTuiFrame } from "../src/tui.js";

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
  expect(wide.join("\n")).toContain("|G| |R| |I| |M| |O| |I| |R| |E|");
  expect(narrow.join("\n")).toContain("ᚷᚱᛁᛗᛟᛁᚱᛖ GRIMOIRE");
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
