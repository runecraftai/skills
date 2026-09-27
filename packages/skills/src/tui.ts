import { createCliRenderer } from "@opentui/core";
import { createRoot, useKeyboard, useTerminalDimensions } from "@opentui/react";
import { createElement as h, useEffect, useMemo, useState } from "react";
import { applyTuiBatch, type ActionResult } from "./tui-actions.js";
import { filterTuiSkills, loadTuiSnapshot, previewText, sanitizeText, targetOptions, type TuiContext } from "./tui-model.js";
import { initialTuiState, moveHighlight, toggleSelected, visibleBatchIds, type TuiState } from "./tui-state.js";
import type { TargetId } from "./targets.js";

const runeBanner = ["  /\\   /\\   /\\   /\\   /\\   /\\   /\\", " /  \\ /  \\ /  \\ /  \\ /  \\ /  \\ /  \\  ", " |G| |R| |I| |M| |O| |I| |R| |E| "];
interface FrameSkill { id: string; name: string; category: string; status: string; selected: boolean; }
interface FrameInput {
  width: number; height: number; query: string; target: string; scope: string; pane: "list" | "preview"; mode: "normal" | "search" | "target" | "confirm";
  skills: FrameSkill[]; categories: Array<{ name: string; count: number }>; highlighted: string; description: string; status: string; tags: string[];
  trigger: string; files: string[]; content: string; previewOffset: number; notice: string[];
}
const clip = (text: string, width: number) => Array.from(text).slice(0, Math.max(0, width)).join("");
const fit = (text: string, width: number) => clip(sanitizeText(text), width).padEnd(Math.max(0, width));
function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph) { out.push(""); continue; }
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const pieces = Array.from(word);
      while (pieces.length > width) {
        if (line) { out.push(line); line = ""; }
        out.push(pieces.splice(0, width).join(""));
      }
      const next = line ? `${line} ${pieces.join("")}` : pieces.join("");
      if (Array.from(next).length > width) { out.push(line); line = pieces.join(""); }
      else line = next;
    }
    if (line) out.push(line);
  }
  return out;
}
function legend(width: number): string[] {
  if (width >= 78) return [
    "Space select · j/k move · gg/G first/last · h/l/Tab pane",
    "/ search · PgUp/PgDn preview · i install · u remove",
    "t target · r refresh · Enter confirm · Esc/n cancel · q quit",
  ];
  if (width >= 54) return [
    "Space select · j/k move · gg/G first/last",
    "h/l/Tab pane · / search · PgUp/PgDn preview",
    "i install · u remove · t target · r refresh",
    "Enter confirm · Esc/n cancel · q quit",
  ];
  return [
    "Space select · j/k move · gg/G ends",
    "h/l/Tab pane · / search",
    "PgUp/Dn scroll · r refresh · t target",
    "i install · u remove",
    "Enter confirm · Esc/n cancel · q quit",
  ];
}
export function buildTuiFrame(model: FrameInput): string[] {
  const width = Math.max(12, Math.floor(model.width)), height = Math.max(1, Math.floor(model.height));
  const inner = width - 2, wide = width >= 80;
  const footer = legend(inner);
  const top = `┌${"─".repeat(inner)}┐`, bottom = `└${"─".repeat(inner)}┘`;
  const full = (text: string) => `│${fit(text, inner)}│`;
  const leftHeader = model.mode === "search" ? `/ ${model.query}` : "/ search skills";
  const rightHeader = `target: ${model.target} ▼ · ${model.scope}`;
  const roomForLeft = Math.max(1, inner - Array.from(rightHeader).length - 2);
  const headerLine = full(`${fit(leftHeader, roomForLeft)}  ${rightHeader}`);
  const leftWidth = wide ? Math.floor((inner - 1) / 2) : inner;
  const rightWidth = wide ? inner - leftWidth - 1 : inner;
  const dividerTop = wide ? `├${"─".repeat(leftWidth)}┬${"─".repeat(rightWidth)}┤` : `├${"─".repeat(inner)}┤`;
  const tail = [`├${"─".repeat(inner)}┤`, ...footer.map((row) => full(row)), bottom];
  const compactBanner = ["ᚷᚱᛁᛗᛟᛁᚱᛖ GRIMOIRE"];
  const banners = width >= 56 ? [runeBanner, compactBanner] : [compactBanner];
  const bannerRow = (banner: string[], row: string) => banner.length === 1 ? fit(row, inner) : clip(row, inner).padStart(Math.floor((inner + row.length) / 2)).padEnd(inner);
  let head: string[] = [];
  for (const banner of banners) {
    head = [top, ...banner.map((row) => full(bannerRow(banner, row))), headerLine, dividerTop];
    if (height - head.length - tail.length >= 1) break;
  }
  while (head.length + tail.length > height && head.length > 1) head.pop();
  while (head.length + tail.length > height && tail.length > 2) tail.splice(1, 1);
  const bodyHeight = Math.max(0, height - head.length - tail.length);
  const focused = model.skills.find((skill) => skill.id === model.highlighted);
  const rows: string[][] = [];
  if (wide || (model.mode !== "target" && model.pane === "list")) {
    const list: string[] = ["SKILLS"];
    for (const category of model.categories) {
      const entries = model.skills.filter((skill) => skill.category === category.name);
      if (!entries.length) continue;
      list.push(`▾ ${category.name} (${entries.length})`);
      for (const skill of entries) {
        const marked = skill.id === model.highlighted ? (skill.selected ? "●◉" : "●") : skill.selected ? "◉" : "○";
        const status = ({ absent: "absent", "managed-clean": "clean", "managed-modified": "modified", "existing-unmanaged/unknown": "unknown", "unreadable/error": "error" } as Record<string, string>)[skill.status] ?? skill.status;
        list.push(`  ${marked} ${skill.name}  ${status}`);
      }
    }
    if (!wide && model.pane === "list") list.push(...model.notice.flatMap((line) => wrap(line, inner)));
    const selectedIndex = Math.max(0, list.findIndex((row) => row.includes(focused?.name ?? "\0")));
    const start = Math.max(0, Math.min(list.length - bodyHeight, selectedIndex - Math.floor(bodyHeight / 2)));
    rows.push(list.slice(start, start + bodyHeight));
  }
  if (wide || model.mode === "target" || model.pane === "preview") {
    const right: string[] = [];
    if (model.mode === "target") {
      right.push(...model.notice.flatMap((line) => wrap(line, rightWidth)));
    } else {
      right.push(focused?.name ?? "No matching skill");
      right.push(...wrap(model.description || "No description available.", rightWidth).slice(0, Math.max(1, Math.min(3, bodyHeight - 8))));
      right.push(`Status: ${model.status}`);
      if (model.tags.length) right.push(...wrap(`Tags: ${model.tags.join(", ")}`, rightWidth).slice(0, 1));
      right.push("Trigger");
      right.push(...wrap(model.trigger || "Not specified — see description", rightWidth).slice(0, 1));
      const files = ["SKILL.md", ...model.files];
      right.push(`Files (${files.length})`);
      const fileRows = files.flatMap((file) => wrap(`  ${file}`, rightWidth));
      const fileBudget = Math.max(0, Math.min(3, bodyHeight - right.length - model.notice.length - 4));
      right.push(...fileRows.slice(0, fileBudget));
      if (fileRows.length > fileBudget) right.push(`  +${fileRows.length - fileBudget} more`);
      if (model.notice.length) right.push(...model.notice.flatMap((line) => wrap(line, rightWidth)));
    }
    right.push("─".repeat(rightWidth));
    const used = right.length;
    const contentHeight = Math.max(0, bodyHeight - used);
    const content = wrap(model.content || "[SKILL.md unavailable]", rightWidth);
    right.push(...content.slice(model.previewOffset, model.previewOffset + contentHeight));
    rows.push(right);
  }
  const lines = [...head];
  for (let i = 0; i < bodyHeight; i++) {
    if (wide) lines.push(`│${fit(rows[0]?.[i] ?? "", leftWidth)}│${fit(rows[1]?.[i] ?? "", rightWidth)}│`);
    else lines.push(full(rows[0]?.[i] ?? ""));
  }
  lines.push(...tail);
  return lines.slice(0, height).map((line) => fit(line, width));
}
export async function runTui(ctx: TuiContext): Promise<number> {
  let renderer: Awaited<ReturnType<typeof createCliRenderer>> | undefined;
  let root: ReturnType<typeof createRoot> | undefined;
  let interruptHandler: (() => void) | undefined;
  try {
    renderer = await createCliRenderer({ exitOnCtrlC: true });
    let done!: (code: number) => void;
    const finished = new Promise<number>((resolve) => { done = resolve; });
    interruptHandler = () => done(130);
    process.once("SIGINT", interruptHandler);
    function App() {
      const [state, setState] = useState<TuiState>(initialTuiState());
      const [target, setTarget] = useState<TargetId>(ctx.target ?? "pi");
      const [mode, setMode] = useState<"normal" | "search" | "target" | "confirm">("normal");
      const [pending, setPending] = useState<"install" | "remove">("install");
      const [message, setMessage] = useState("");
      const [gPending, setGPending] = useState(false);
      const [result, setResult] = useState<ActionResult | null>(null);
      const [snapshotVersion, setSnapshotVersion] = useState(0);
      const { width, height } = useTerminalDimensions();
      const snapshot = useMemo(() => loadTuiSnapshot({ ...ctx, target }), [target, snapshotVersion]);
      const visible = filterTuiSkills(snapshot.skills, state.query);
      useEffect(() => {
        if (visible.length && !visible.some((skill) => skill.id === state.highlighted)) setState((value) => ({ ...value, highlighted: visible[0].id }));
        else if (!visible.length && state.highlighted) setState((value) => ({ ...value, highlighted: "" }));
      }, [state.highlighted, visible[0]?.id]);
      const current = visible.find((skill) => skill.id === state.highlighted) ?? visible[0];
      const destLabel = `${target} · ${snapshot.scope}`;
      useKeyboard((key) => {
        if (key.eventType === "release") return;
        const name = key.name, char = key.sequence ?? name;
        if (mode === "search") {
          if (name === "escape") { setMode("normal"); setState((s) => ({ ...s, query: "" })); return; }
          if (name === "return" || name === "enter") { setMode("normal"); return; }
          if (name === "backspace") { setState((s) => ({ ...s, query: s.query.slice(0, -1) })); return; }
          if (char && char.length === 1 && !key.ctrl && !key.meta) setState((s) => ({ ...s, query: s.query + char }));
          return;
        }
        if (mode === "target") {
          if (name === "escape") { setMode("normal"); return; }
          if (name === "j" || name === "down" || name === "l") setTarget((t) => { const options = targetOptions({ ...ctx, target: t }); return options[(options.findIndex((x) => x.id === t) + 1) % options.length].id; });
          if (name === "k" || name === "up" || name === "h") setTarget((t) => { const options = targetOptions({ ...ctx, target: t }); return options[(options.findIndex((x) => x.id === t) + options.length - 1) % options.length].id; });
          if (name === "return" || name === "enter") { setMode("normal"); setSnapshotVersion((v) => v + 1); }
          return;
        }
        if (mode === "confirm") {
          if (name === "escape" || name === "n") { setMode("normal"); setMessage("Action cancelled; no files changed."); return; }
          if (name === "return" || name === "enter" || name === "y") {
            const ids = visibleBatchIds(state);
            const outcome = applyTuiBatch({ ...ctx, target }, ids, pending, true);
            setResult(outcome); setMessage(`${pending}: ${outcome.succeeded.length} succeeded, ${outcome.failed.length} failed`); setSnapshotVersion((v) => v + 1); setMode("normal");
          }
          return;
        }
        if (name === "q") { done(0); return; }
        if (name === "escape") { if (state.query) setState((s) => ({ ...s, query: "" })); else done(0); return; }
        if (name === "/") { setMode("search"); setState((s) => ({ ...s, query: "" })); return; }
        if (name === "r") { setSnapshotVersion((v) => v + 1); setMessage("Status refreshed (read-only)."); return; }
        if (name === "t") { setMode("target"); return; }
        if (name === "tab" || name === "h" || name === "l") { setState((s) => ({ ...s, pane: s.pane === "list" ? "preview" : "list" })); return; }
        if (name === "space") { setState((s) => toggleSelected({ ...s, highlighted: s.highlighted || visible[0]?.id || "" })); return; }
        if (name === "j" || name === "down") setState((s) => moveHighlight(s, snapshot.skills, 1));
        if (name === "k" || name === "up") setState((s) => moveHighlight(s, snapshot.skills, -1));
        if (name === "G" || (name === "g" && key.shift)) setState((s) => ({ ...s, highlighted: visible.at(-1)?.id ?? s.highlighted, previewOffset: 0 }));
        if (name === "i" || name === "u") {
          const ids = visibleBatchIds(state);
          if (!ids.length) return;
          const detailRows = ids.reduce((rows, id) => rows + Math.ceil((id.length + destLabel.length + 24) / width), 0);
          if (width < 80 || height < 16 || detailRows > height - 8) { setMessage("Resize to at least 80x16 to review this action safely; nothing changed."); return; }
          setPending(name === "i" ? "install" : "remove"); setMode("confirm");
        }
        if (name === "g") {
          if (gPending) { setState((s) => ({ ...s, highlighted: visible[0]?.id ?? "", previewOffset: 0 })); setGPending(false); }
          else { setGPending(true); setTimeout(() => setGPending(false), 450); }
        }
        if (name === "pageup") setState((s) => ({ ...s, previewOffset: Math.max(0, s.previewOffset - 12) }));
        if (name === "pagedown") setState((s) => ({ ...s, previewOffset: s.previewOffset + 12 }));
      });
      const targetInfo = targetOptions({ ...ctx, target }).find((option) => option.id === target)!;
      const actionIds = visibleBatchIds(state);
      const modal = mode === "confirm" ? `${pending.toUpperCase()} ${actionIds.join(", ")} → ${destLabel}? Enter/y confirms; Esc/n cancels.` : message;
      const resultLines = result ? [...result.succeeded.map((item) => `OK ${item.id} → ${destLabel}`), ...result.failed.map((item) => `FAILED ${item.id} → ${destLabel}: ${item.reason}`)] : [];
      const notice = [
        ...(snapshot.lockError ? [`Lockfile error — mutations disabled: ${snapshot.lockError}`] : []),
        ...(mode === "target" ? [`Choose target: ${targetInfo.label} (${snapshot.scope})`, `Destination: ${targetInfo.id} · ${targetInfo.scope}`, "j/k change · Enter select · Esc cancel"] : []),
        ...(mode === "confirm" ? [modal] : []),
        ...(mode === "normal" && message ? [message, ...resultLines] : []),
      ];
      const frame = buildTuiFrame({
        width, height, query: state.query, target, scope: snapshot.scope, pane: state.pane, mode,
        skills: visible.map((skill) => ({ id: skill.id, name: skill.name, category: skill.category ?? "Other", status: snapshot.statuses[skill.id]?.status ?? "unreadable/error", selected: state.selected.has(skill.id) })),
        categories: snapshot.categories, highlighted: current?.id ?? "", description: current?.description ?? "", status: current ? snapshot.statuses[current.id]?.status ?? "unreadable/error" : "unreadable/error", tags: current?.tags ?? [],
        trigger: current?.trigger ?? "Not specified — see description", files: current?.files ?? [], content: previewText(current?.content ?? null, current?.contentError), previewOffset: state.previewOffset, notice,
      });
      return h("text" as never, { width, height, wrapMode: "none", fg: "white" } as never, frame.join("\n"));
    }
    root = createRoot(renderer);
    root.render(h(App, null));
    return await finished;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`grimoire: OpenTUI could not start (${detail}). Install optional platform dependencies and use Node >=26.4.0 with FFI or Bun >=1.3.0.`);
    return 1;
  } finally { if (interruptHandler) process.off("SIGINT", interruptHandler); root?.unmount(); renderer?.destroy(); }
}
