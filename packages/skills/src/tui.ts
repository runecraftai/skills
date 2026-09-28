import { createCliRenderer } from "@opentui/core";
import { createRoot, useKeyboard, useTerminalDimensions } from "@opentui/react";
import { createElement as h, useEffect, useMemo, useRef, useState } from "react";
import { applyTuiBatch, type ActionResult } from "./tui-actions.js";
import { filterTuiSkills, loadTuiSnapshot, previewText, sanitizeText, targetOptions, type TuiContext } from "./tui-model.js";
import { initialTuiState, moveHighlight, toggleSelected, visibleBatchIds, type TuiState } from "./tui-state.js";
import type { TargetId } from "./targets.js";

const runeBanner = [
  "ᛝ  ██████╗ ██████╗ ██╗███╗   ███╗ ██████╗ ██╗██████╗ ███████╗  ᛝ",
  "   ██╔════╝ ██╔══██╗██║████╗ ████║██╔═══██╗██║██╔══██╗██╔════╝",
  "   ██║  ███╗██████╔╝██║██╔████╔██║██║   ██║██║██████╔╝█████╗",
  "   ██║   ██║██╔══██╗██║██║╚██╔╝██║██║   ██║██║██╔══██╗██╔══╝",
  "   ╚██████╔╝██║  ██║██║██║ ╚═╝ ██║╚██████╔╝██║██║  ██║███████╗",
  "    ╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝     ╚═╝ ╚═════╝ ╚═╝╚═╝  ╚═╝╚══════╝",
];
const compactBanner = [
  "╔═╗╦═╗╦╔╦╗╔═╗╦╦═╗╔═╗",
  "║ ╦╠╦╝║║║║║ ║║╠╦╝║╣",
  "╚═╝╩╚═╩╩ ╩╚═╝╩╩╚═╚═╝",
];
const noticeReserve = 3;
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
function frameLayout(width: number, height: number) {
  const w = Math.max(12, Math.floor(width)), h = Math.max(1, Math.floor(height));
  const inner = w - 2, wide = w >= 80;
  const tail = 2 + legend(inner).length;
  const runeArtWidth = Math.max(...runeBanner.map((row) => row.length));
  const banner = inner >= runeArtWidth && h - tail >= 13 ? runeBanner : compactBanner;
  const leftWidth = wide ? Math.floor((inner - 1) / 2) : inner;
  return { w, h, inner, wide, banner, leftWidth, rightWidth: wide ? inner - leftWidth - 1 : inner, bodyHeight: Math.max(0, h - (3 + banner.length) - tail) };
}
export function confirmPrompt(action: "install" | "remove", actionIds: string[], destLabel: string): string {
  return `${action.toUpperCase()} ${actionIds.join(", ")} → ${destLabel}? Enter/y confirms; Esc/n cancels.`;
}
export function lockErrorNotice(lockError?: string): string[] { return lockError ? [`Lockfile error — mutations disabled: ${lockError}`] : []; }
export function confirmReviewFits(action: "install" | "remove", actionIds: string[], destLabel: string, width: number, height: number, lockError?: string): boolean {
  const layout = frameLayout(width, height);
  const lockRows = lockErrorNotice(lockError).flatMap((line) => wrap(line, layout.rightWidth)).length;
  const room = layout.bodyHeight - noticeReserve - lockRows;
  return room > 0 && wrap(confirmPrompt(action, actionIds, destLabel), layout.rightWidth).length <= room;
}
export function confirmGateNotice(action: "install" | "remove", actionIds: string[], destLabel: string, width: number, height: number, lockError?: string): string | null {
  if (width < 80 || height < 16) return "Resize to at least 80x16 to review this action safely; nothing changed.";
  if (!confirmReviewFits(action, actionIds, destLabel, width, height, lockError)) return "Not enough room to review this action safely; deselect skills or enlarge the terminal; nothing changed.";
  return null;
}
export function clampPreviewOffset(offset: number, max: number): number { return Math.max(0, Math.min(offset, max)); }
export function buildTuiFrame(model: FrameInput, bounds?: { previewMax: number }): string[] {
  if (bounds) bounds.previewMax = 0;
  const layout = frameLayout(model.width, model.height);
  const width = layout.w, height = layout.h, inner = layout.inner, wide = layout.wide, banner = layout.banner;
  const footer = legend(inner);
  const top = `┌${"─".repeat(inner)}┐`, bottom = `└${"─".repeat(inner)}┘`;
  const full = (text: string) => `│${fit(text, inner)}│`;
  const leftHeader = model.mode === "search" ? `/ ${model.query}` : "/ search skills";
  const rightHeader = `target: ${model.target} ▼ · ${model.scope}`;
  const roomForLeft = Math.max(1, inner - Array.from(rightHeader).length - 2);
  const headerLine = full(`${fit(leftHeader, roomForLeft)}  ${rightHeader}`);
  const leftWidth = layout.leftWidth;
  const rightWidth = layout.rightWidth;
  const dividerTop = wide ? `├${"─".repeat(leftWidth)}┬${"─".repeat(rightWidth)}┤` : `├${"─".repeat(inner)}┤`;
  const tail = [`├${"─".repeat(inner)}┤`, ...footer.map((row) => full(row)), bottom];
  const artWidth = Math.max(...banner.map((row) => row.length));
  const offset = Math.max(0, Math.floor((inner - artWidth) / 2));
  const bannerRows = banner.map((row) => fit(" ".repeat(offset) + row.padEnd(artWidth), inner));
  let head = [top, ...bannerRows.map(full), headerLine, dividerTop];
  while (head.length + tail.length > height && head.length > 1) head.pop();
  while (head.length + tail.length > height && tail.length > 2) tail.splice(1, 1);
  const bodyHeight = Math.max(0, height - head.length - tail.length);
  const focused = model.skills.find((skill) => skill.id === model.highlighted);
  const rows: string[][] = [];
  if (wide || (model.mode !== "target" && model.pane === "list")) {
    const list: string[] = ["SKILLS"];
    let selectedIndex = 0;
    for (const category of model.categories) {
      const entries = model.skills.filter((skill) => skill.category === category.name);
      if (!entries.length) continue;
      list.push(`▾ ${category.name} (${entries.length})`);
      for (const skill of entries) {
        const marked = skill.id === model.highlighted ? (skill.selected ? "●◉" : "●") : skill.selected ? "◉" : "○";
        const status = ({ absent: "absent", "managed-clean": "clean", "managed-modified": "modified", "existing-unmanaged/unknown": "unknown", "unreadable/error": "error" } as Record<string, string>)[skill.status] ?? skill.status;
        list.push(`  ${marked} ${skill.name}  ${status}`);
        if (skill.id === model.highlighted) selectedIndex = list.length - 1;
      }
    }
    const noticeRows = !wide && model.pane === "list" ? model.notice.flatMap((line) => wrap(line, inner)) : [];
    const noticeTake = Math.min(noticeRows.length, bodyHeight > 1 ? bodyHeight - 1 : bodyHeight);
    const listHeight = bodyHeight - noticeTake;
    const start = Math.max(0, Math.min(list.length - listHeight, selectedIndex - Math.floor(listHeight / 2)));
    rows.push([...list.slice(start, start + listHeight), ...noticeRows.slice(0, noticeTake)]);
  }
  if (wide || model.mode === "target" || model.pane === "preview") {
    const right: string[] = [];
    const noticeRows = model.notice.flatMap((line) => wrap(line, rightWidth));
    if (model.mode === "target") {
      right.push(...noticeRows);
    } else {
      const pinned = noticeRows.slice(0, bodyHeight > 0 ? Math.max(1, bodyHeight - noticeReserve) : 0);
      right.push(...pinned);
      let budget = Math.max(0, bodyHeight - pinned.length - 2);
      const nameRows = [focused?.name ?? "No matching skill"];
      const descRows = wrap(model.description || "No description available.", rightWidth).slice(0, 3);
      const statusRows = [`Status: ${model.status}`];
      const tagRows = model.tags.length ? wrap(`Tags: ${model.tags.join(", ")}`, rightWidth).slice(0, 1) : [];
      const triggerRows = ["Trigger", ...wrap(model.trigger || "Not specified — see description", rightWidth).slice(0, 1)];
      const files = ["SKILL.md", ...model.files];
      const allFileRows = files.flatMap((file) => wrap(`  ${file}`, rightWidth));
      const counts: Record<string, number> = { name: 0, status: 0, trigger: 0, files: 0, desc: 0, tags: 0 };
      for (const [key, min] of [["name", 1], ["desc", 1], ["trigger", 2], ["files", 2], ["status", 1], ["tags", 0]] as const) {
        const give = Math.min(min, budget);
        counts[key] = give;
        budget -= give;
      }
      const maxes: Record<string, number> = { name: 1, status: 1, trigger: triggerRows.length, files: Math.min(allFileRows.length, 3) + 2, desc: descRows.length, tags: tagRows.length };
      for (const key of ["desc", "files", "tags"] as const) {
        const give = Math.min(maxes[key] - counts[key], budget);
        counts[key] += give;
        budget -= give;
      }
      right.push(...nameRows.slice(0, counts.name));
      right.push(...descRows.slice(0, counts.desc));
      right.push(...statusRows.slice(0, counts.status));
      right.push(...tagRows.slice(0, counts.tags));
      if (counts.trigger === 1 && triggerRows[1]) right.push(`Trigger: ${triggerRows[1]}`);
      else right.push(...triggerRows.slice(0, counts.trigger));
      if (counts.files) {
        const head = `Files (${files.length})`, room = counts.files - 1;
        if (allFileRows.length <= room) right.push(head, ...allFileRows);
        else if (room >= 2) right.push(head, ...allFileRows.slice(0, room - 1), `  +${allFileRows.length - (room - 1)} more`);
        else if (room >= 1) right.push(head, ...allFileRows.slice(0, room));
        else right.push(allFileRows.length ? `${head}: ${allFileRows[0].trim()}` : head);
      }
    }
    right.push("─".repeat(rightWidth));
    const used = right.length;
    const contentHeight = Math.max(0, bodyHeight - used);
    const content = wrap(model.content || "[SKILL.md unavailable]", rightWidth);
    const previewMax = Math.max(0, content.length - contentHeight);
    if (bounds) bounds.previewMax = previewMax;
    const offset = clampPreviewOffset(model.previewOffset, previewMax);
    right.push(...content.slice(offset, offset + contentHeight));
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
      const [result, setResult] = useState<{ outcome: ActionResult; dest: string } | null>(null);
      const [snapshotVersion, setSnapshotVersion] = useState(0);
      const scroll = useRef({ previewMax: 0 }).current;
      const { width, height } = useTerminalDimensions();
      const snapshot = useMemo(() => loadTuiSnapshot({ ...ctx, target }), [target, snapshotVersion]);
      const visible = filterTuiSkills(snapshot.skills, state.query);
      const visibleKey = visible.map((skill) => skill.id).join("\n");
      useEffect(() => {
        if (visible.length && !visible.some((skill) => skill.id === state.highlighted)) setState((value) => ({ ...value, highlighted: visible[0].id }));
        else if (!visible.length && state.highlighted) setState((value) => ({ ...value, highlighted: "" }));
      }, [state.highlighted, visibleKey]);
      const current = visible.find((skill) => skill.id === state.highlighted) ?? visible[0];
      const destLabel = `${target} · ${snapshot.scope}`;
      useEffect(() => {
        if (mode !== "confirm") return;
        const blocked = confirmGateNotice(pending, visibleBatchIds(state), destLabel, width, height, snapshot.lockError);
        if (blocked) { setMode("normal"); setMessage(blocked); }
      }, [mode, pending, state, destLabel, width, height, snapshot.lockError]);
      useKeyboard((key) => {
        if (key.eventType === "release") return;
        setMessage(""); setResult(null);
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
            const blocked = confirmGateNotice(pending, ids, destLabel, width, height, snapshot.lockError);
            if (blocked) { setMessage(blocked); setMode("normal"); return; }
            const outcome = applyTuiBatch({ ...ctx, target }, ids, pending, true);
            setResult({ outcome, dest: destLabel }); setMessage(`${pending}: ${outcome.succeeded.length} succeeded, ${outcome.failed.length} failed`); setSnapshotVersion((v) => v + 1); setMode("normal");
          }
          return;
        }
        if (name === "q") { done(0); return; }
        if (name === "escape") { if (state.query) setState((s) => ({ ...s, query: "" })); return; }
        if (name === "/") { setMode("search"); setState((s) => ({ ...s, query: "" })); return; }
        if (name === "r") { setSnapshotVersion((v) => v + 1); setMessage("Status refreshed (read-only)."); return; }
        if (name === "t") { setMode("target"); return; }
        if (name === "tab" || name === "h" || name === "l") { setState((s) => ({ ...s, pane: s.pane === "list" ? "preview" : "list" })); return; }
        if (name === "space") { setState((s) => toggleSelected({ ...s, highlighted: s.highlighted || visible[0]?.id || "" })); return; }
        if (name === "j" || name === "down") setState((s) => moveHighlight(s, snapshot.skills, 1));
        if (name === "k" || name === "up") setState((s) => moveHighlight(s, snapshot.skills, -1));
        if (name === "G" || (name === "g" && key.shift)) { setState((s) => ({ ...s, highlighted: visible.at(-1)?.id ?? s.highlighted, previewOffset: 0 })); return; }
        if (name === "i" || name === "u") {
          const ids = visibleBatchIds(state);
          if (!ids.length) return;
          const action = name === "i" ? "install" : "remove";
          const blocked = confirmGateNotice(action, ids, destLabel, width, height, snapshot.lockError);
          if (blocked) { setMessage(blocked); return; }
          setPending(action); setMode("confirm");
        }
        if (name === "g") {
          if (gPending) { setState((s) => ({ ...s, highlighted: visible[0]?.id ?? "", previewOffset: 0 })); setGPending(false); }
          else { setGPending(true); setTimeout(() => setGPending(false), 450); }
        }
        if (name === "pageup") setState((s) => ({ ...s, previewOffset: clampPreviewOffset(s.previewOffset - 12, scroll.previewMax) }));
        if (name === "pagedown") setState((s) => ({ ...s, previewOffset: clampPreviewOffset(s.previewOffset + 12, scroll.previewMax) }));
      });
      const targetInfo = targetOptions({ ...ctx, target }).find((option) => option.id === target)!;
      const actionIds = visibleBatchIds(state);
      const modal = mode === "confirm" ? confirmPrompt(pending, actionIds, destLabel) : message;
      const resultLines = result ? [...result.outcome.failed.map((item) => `FAILED ${item.id} → ${result.dest}: ${item.reason}`), ...result.outcome.succeeded.map((item) => `OK ${item.id} → ${result.dest}`)] : [];
      const notice = [
        ...(lockErrorNotice(snapshot.lockError)),
        ...(mode === "target" ? [`Choose target: ${targetInfo.label} (${snapshot.scope})`, `Destination: ${targetInfo.id} · ${targetInfo.scope}`, "j/k change · Enter select · Esc close (keeps target)"] : []),
        ...(mode === "confirm" ? [modal] : []),
        ...(mode === "normal" && message ? [message, ...resultLines] : []),
      ];
      const frame = buildTuiFrame({
        width, height, query: state.query, target, scope: snapshot.scope, pane: state.pane, mode,
        skills: visible.map((skill) => ({ id: skill.id, name: skill.name, category: skill.category ?? "Other", status: snapshot.statuses[skill.id]?.status ?? "unreadable/error", selected: state.selected.has(skill.id) })),
        categories: snapshot.categories, highlighted: current?.id ?? "", description: current?.description ?? "", status: current ? snapshot.statuses[current.id]?.status ?? "unreadable/error" : "unreadable/error", tags: current?.tags ?? [],
        trigger: current?.trigger ?? "Not specified — see description", files: current?.files ?? [], content: previewText(current?.content ?? null, current?.contentError), previewOffset: state.previewOffset, notice,
      }, scroll);
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
