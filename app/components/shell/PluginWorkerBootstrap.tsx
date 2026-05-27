"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLayoutStore } from "@/lib/layout/store";
import { getPayloadAdapter } from "@/lib/dnd-payloads";
import { useDragContext } from "@/lib/dnd-payloads/drag-context";
import {
  startPendingWriteWorker,
  stopPendingWriteWorker,
  type Executor,
} from "@/lib/dnd-payloads/pending-writes";

/**
 * Mounts the plugin retry-queue worker on app boot. Looks up the live card
 * + adapter at execution time so registry / config changes flow through.
 * The worker captures the app's QueryClient via the React hook so successful
 * accepts can invalidate the affected tile queries (Trello cards, Calendar
 * events) — making the appended badge appear without a manual reload.
 */
export function PluginWorkerBootstrap() {
  const qc = useQueryClient();
  useEffect(() => {
    const debug = process.env.NEXT_PUBLIC_LENS_DEBUG === "1";
    const executor: Executor = async (pending) => {
      const card = useLayoutStore.getState().cards.find((c) => c.id === pending.cardId);
      if (!card) {
        return { ok: false, reason: `card-not-found: ${pending.cardId}` };
      }
      const adapter = getPayloadAdapter(card, pending.payload.kind);
      if (!adapter) {
        return { ok: false, reason: `no adapter for ${pending.payload.kind}` };
      }
      const fn =
        pending.kind === "accept" ? adapter.onAccept : adapter.onContentEdited;
      if (!fn) {
        return {
          ok: false,
          reason: `${pending.kind} not supported by ${card.connector}`,
        };
      }
      if (debug) {
        console.log("[lens-plugin] dispatch", {
          connector: card.connector,
          tile: card.tile,
          kind: pending.kind,
          target: pending.target,
          payload: pending.payload,
        });
      }
      const result = await fn(card, pending.payload, pending.target);
      if (debug) console.log("[lens-plugin] result", result);
      if (result.ok && pending.kind === "accept" && adapter.invalidateOnAccept) {
        for (const queryKey of adapter.invalidateOnAccept(card, pending.target)) {
          await qc.invalidateQueries({ queryKey: queryKey as unknown[] });
        }
      }
      return result;
    };
    startPendingWriteWorker(executor);

    if (process.env.NEXT_PUBLIC_LENS_DEBUG === "1") {
      (window as unknown as Record<string, unknown>).__lensDebug = {
        beginDrag: useDragContext.getState().beginDrag,
        endDrag: useDragContext.getState().endDrag,
      };
    }

    return () => stopPendingWriteWorker();
  }, [qc]);
  return null;
}
