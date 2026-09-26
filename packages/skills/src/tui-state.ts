import { filterTuiSkills, type TuiSkill } from "./tui-model.js";
export interface TuiState { query: string; highlighted: string; selected: Set<string>; pane: "list" | "preview"; previewOffset: number; }
export const initialTuiState = (): TuiState => ({ query: "", highlighted: "", selected: new Set(), pane: "list", previewOffset: 0 });
export function moveHighlight(state: TuiState, skills: TuiSkill[], delta: number): TuiState {
  const visible = filterTuiSkills(skills, state.query); if (!visible.length) return state;
  const index = Math.max(0, visible.findIndex((skill) => skill.id === state.highlighted));
  return { ...state, highlighted: visible[Math.max(0, Math.min(visible.length - 1, index + delta))].id, previewOffset: 0 };
}
export function toggleSelected(state: TuiState): TuiState {
  if (!state.highlighted) return state;
  const selected = new Set(state.selected); selected.has(state.highlighted) ? selected.delete(state.highlighted) : selected.add(state.highlighted);
  return { ...state, selected };
}
export function visibleBatchIds(state: TuiState): string[] { return state.selected.size ? [...state.selected] : state.highlighted ? [state.highlighted] : []; }
