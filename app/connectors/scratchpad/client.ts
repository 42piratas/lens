import {
  SCRATCHPAD_SCHEMA_VERSION,
  scratchpadStateSchema,
  type BoundSource,
  type ScratchpadState,
} from "./types";

/**
 * Scratchpad client — single-binding facade over `localStorage['lens.scratchpad']`.
 *
 * **Local-connector pattern:** runs client-side; the `useScratchpad()` hook in
 * `lib/hooks/use-scratchpad.ts` wraps these primitives with a stable snapshot.
 *
 * **Model (v2):** the scratchpad holds ONE active binding at a time.
 * `binding` carries the source identity + immutable `originalContent` (so we
 * can render a "modified" indicator); `content` is the live editable buffer.
 * On migration from v1 (clip list) → v2 the legacy data is wiped: the new
 * model is fundamentally different and the legacy data was dev-test only.
 */

export const STORAGE_KEY = "lens.scratchpad";

const emptyState: ScratchpadState = {
  version: SCRATCHPAD_SCHEMA_VERSION,
  binding: null,
  content: "",
};

export function readScratchpad(): ScratchpadState {
  if (typeof window === "undefined") return emptyState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = scratchpadStateSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return emptyState;
    return parsed.data;
  } catch {
    return emptyState;
  }
}

function writeScratchpad(state: ScratchpadState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* localStorage unavailable — drop silently */
  }
}

export function setBinding(binding: BoundSource): ScratchpadState {
  const next: ScratchpadState = {
    version: SCRATCHPAD_SCHEMA_VERSION,
    binding,
    content: binding.originalContent,
  };
  writeScratchpad(next);
  return next;
}

export function updateContent(content: string): ScratchpadState {
  const state = readScratchpad();
  const next: ScratchpadState = { ...state, content };
  writeScratchpad(next);
  return next;
}

export function clearBinding(): ScratchpadState {
  writeScratchpad(emptyState);
  return emptyState;
}

export function isBound(connector: string, sourceId: string): boolean {
  const state = readScratchpad();
  return (
    state.binding?.connector === connector &&
    state.binding?.sourceId === sourceId
  );
}
