"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useScratchpad } from "@/lib/hooks/use-scratchpad";
import { readScratchpad } from "./client";
import { SCRATCHPAD_SCHEMA_VERSION, type ScratchpadState } from "./types";
import {
  migrateScratchpadToServer,
  pullScratchpadFromServer,
  pushScratchpadToServer,
} from "./sync";

const PUSH_DEBOUNCE_MS = 750;
const STORAGE_KEY = "lens.scratchpad";

const EMPTY_STATE: ScratchpadState = {
  version: SCRATCHPAD_SCHEMA_VERSION,
  binding: null,
  content: "",
};

function isEmpty(state: ScratchpadState): boolean {
  return state.binding === null && state.content.length === 0;
}

export function ScratchpadSyncBridge() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const { state } = useScratchpad();
  const hydratedFromServer = useRef(false);
  const lastPushedSignature = useRef<string>("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !userId || hydratedFromServer.current) return;
    let cancelled = false;
    (async () => {
      const remote = await pullScratchpadFromServer();
      if (cancelled) return;
      const local = readScratchpad();
      if (remote && !isEmpty(remote)) {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
          window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
        } catch {
          /* ignore */
        }
      } else if (!isEmpty(local)) {
        await migrateScratchpadToServer(local);
      } else {
        await migrateScratchpadToServer(EMPTY_STATE);
      }
      hydratedFromServer.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [status, userId]);

  useEffect(() => {
    if (status !== "authenticated" || !hydratedFromServer.current) return;
    const payload: ScratchpadState = {
      version: SCRATCHPAD_SCHEMA_VERSION,
      binding: state.binding,
      content: state.content,
    };
    const signature = JSON.stringify(payload);
    if (signature === lastPushedSignature.current) return;
    lastPushedSignature.current = signature;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      void pushScratchpadToServer(payload);
    }, PUSH_DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [state, status]);

  return null;
}
