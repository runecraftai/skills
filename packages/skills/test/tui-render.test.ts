import { expect, test } from "bun:test";
import { createTestRenderer } from "@opentui/core/testing";
import { createRoot } from "@opentui/react";
import { createElement } from "react";

test("OpenTUI frame keeps catalog legend visible at normal and narrow widths", async () => {
  const screen = await createTestRenderer({ width: 80, height: 24 });
  try {
    createRoot(screen.renderer).render(createElement("box", { flexDirection: "column", width: "100%", height: "100%" },
      createElement("text", null, "GRIMOIRE  Local skills"),
      createElement("text", null, "alpha  [absent]"),
      createElement("text", null, "/ search  j/k move  Space select  q quit")));
    screen.renderer.start();
    await screen.renderOnce();
    await screen.flush();
    expect(screen.captureCharFrame()).toContain("GRIMOIRE");
    expect(screen.captureCharFrame()).toContain("Space select");
    screen.resize(32, 12);
    await screen.renderOnce();
    await screen.flush();
    expect(screen.captureCharFrame()).toContain("q quit");
  } finally { screen.renderer.destroy(); }
});
