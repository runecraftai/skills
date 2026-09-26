import { createCliRenderer } from "@opentui/core";
import { createRoot, useKeyboard, useTerminalDimensions } from "@opentui/react";
import { createElement as h, useEffect, useMemo, useState } from "react";
import { applyTuiBatch, type ActionResult } from "./tui-actions.js";
import { filterTuiSkills, loadTuiSnapshot, previewText, targetOptions, type TuiContext } from "./tui-model.js";
import { initialTuiState, moveHighlight, toggleSelected, visibleBatchIds, type TuiState } from "./tui-state.js";
import type { TargetId } from "./targets.js";

const e = (type: string, props: Record<string, unknown> | null, ...children: unknown[]) => h(type as never, props, ...children as never[]);
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
      const narrow = width < 80;
      const escape = (value: string) => value.replace(/\n/g, " ").slice(0, 160);
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
          const detailRows = ids.reduce((rows, id) => rows + Math.ceil((id.length + snapshot.destination.length + 24) / width), 0);
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
      const focused = current;
      const line = (text: string, props: Record<string, unknown> = {}) => e("text", props, text);
      const listRows = snapshot.categories.flatMap((category) => {
        const entries = visible.filter((skill) => (skill.category ?? "Other") === category.name);
        return entries.length ? [{ id: `category:${category.name}`, node: line(`${category.name} (${entries.length})`, { fg: "yellow" }) }, ...entries.map((skill) => ({ id: skill.id, node: line(`${state.selected.has(skill.id) ? "●" : "○"} ${skill.id === focused?.id ? ">" : " "} ${skill.name}  [${snapshot.statuses[skill.id]?.status ?? "error"}]`, { fg: skill.id === focused?.id ? "cyan" : "white" }) }))] : [];
      });
      const listHeight = Math.max(1, height - 8), focusedRow = Math.max(0, listRows.findIndex((row) => row.id === focused?.id));
      const listStart = Math.max(0, Math.min(listRows.length - listHeight, focusedRow - Math.floor(listHeight / 2)));
      const list = listRows.slice(listStart, listStart + listHeight).map((row) => row.node);
      const content = focused ? previewText(focused.content, focused.contentError).split("\n").slice(state.previewOffset, state.previewOffset + Math.max(1, height - 10)).map((text) => line(escape(text))) : [line("No skills match this search.")];
      const targetInfo = targetOptions({ ...ctx, target }).find((option) => option.id === target)!;
      const actionIds = visibleBatchIds(state);
      const modal = mode === "target" ? `Target ${targetInfo.label} — ${targetInfo.scope}: ${targetInfo.path}  (j/k, Enter, Esc)` : mode === "confirm" ? `${pending.toUpperCase()} ${actionIds.join(", ")} → ${snapshot.destination}? Enter/y confirms; Esc/n cancels.` : mode === "search" ? `Search: ${state.query}_` : message;
      const resultLines = result ? [...result.succeeded.map((item) => `OK ${item.id} → ${item.destination}`), ...result.failed.map((item) => `FAILED ${item.id} → ${item.destination}: ${item.reason}`)] : [];
      const legend = "/ search  j/k move  gg/G first/last  Space select  h/l/Tab pane  i install  u remove  t target  r refresh  q quit  PgUp/PgDn preview";
      const listPane = e("box", { flexDirection: "column", width: narrow ? "100%" : "38%", height: "100%" }, ...list);
      const previewPane = e("box", { flexDirection: "column", flexGrow: 1, height: "100%" },
        line(focused ? `${focused.name} — ${focused.category ?? "Other"}` : "Preview"),
        ...(focused ? [line(escape(focused.description)), line(`Tags: ${focused.tags.join(", ") || "Not specified"} · Trigger: ${focused.trigger ?? "Not specified — see description"}`), line(`Supporting files (${focused.files.length}): ${focused.files.slice(0, 10).join(", ") || "none"}${focused.files.length > 10 ? `, +${focused.files.length - 10} more` : ""}`)] : []),
        ...content);
      const panes = narrow ? [state.pane === "list" ? listPane : previewPane] : [listPane, previewPane];
      return e("box", { flexDirection: "column", width: "100%", height: "100%", padding: 1 },
        line("GRIMOIRE  Local skills", { fg: "cyan" }),
        line(`${snapshot.categories.map((category) => `${category.name} (${category.count})`).join(" · ")}`),
        line(`Target ${targetInfo.label} · ${snapshot.scope} · ${snapshot.destination}`),
        ...(snapshot.lockError ? [line(`Lockfile error — mutations disabled: ${snapshot.lockError}`, { fg: "red" })] : []),
        e("box", { flexDirection: "row", flexGrow: 1 }, ...panes),
        line(modal), ...resultLines.map((text) => line(text, { fg: "red" })), line(legend, { fg: "yellow" }));
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
