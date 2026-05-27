"use client";

import { useSyncExternalStore } from "react";
import {
  STORAGE_KEY,
  clearBinding as clientClearBinding,
  readScratchpad,
  setBinding as clientSetBinding,
  updateContent as clientUpdateContent,
} from "@/connectors/scratchpad/client";
import type { BoundSource, ScratchpadState } from "@/connectors/scratchpad/types";

type Listener = () => void;
const listeners = new Set<Listener>();

const EMPTY_STATE: ScratchpadState = { version: 2, binding: null, content: "" };

let cachedSnapshot: ScratchpadState = EMPTY_STATE;
let cachedRaw: string | null | undefined = undefined;

function getSnapshot(): ScratchpadState {
  if (typeof window === "undefined") return EMPTY_STATE;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  cachedSnapshot = readScratchpad();
  return cachedSnapshot;
}

function getServerSnapshot(): ScratchpadState {
  return EMPTY_STATE;
}

function notify(): void {
  cachedRaw = undefined;
  for (const l of listeners) l();
}

function subscribe(cb: Listener): () => void {
  listeners.add(cb);
  function onStorage(e: StorageEvent) {
    if (e.key === STORAGE_KEY || e.key === null) {
      cachedRaw = undefined;
      cb();
    }
  }
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function useScratchpad(): {
  state: ScratchpadState;
  setBinding: (binding: BoundSource) => void;
  updateContent: (content: string) => void;
  clearBinding: () => void;
} {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    state,
    setBinding: (binding) => {
      clientSetBinding(binding);
      notify();
    },
    updateContent: (content) => {
      clientUpdateContent(content);
      notify();
    },
    clearBinding: () => {
      clientClearBinding();
      notify();
    },
  };
}
