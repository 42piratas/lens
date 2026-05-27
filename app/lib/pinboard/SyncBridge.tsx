"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { usePinboardStore } from "./store";
import { PINBOARD_SCHEMA_VERSION } from "./schema";
import {
  migratePinboardToServer,
  pullPinboardFromServer,
  pushPinboardToServer,
} from "./sync";

const PUSH_DEBOUNCE_MS = 750;

/**
 * Bidirectional bridge between the pinboard store (localStorage cache)
 * and `public.pinboards.state` (Supabase, source of truth post b02-11).
 *
 * Same shape as `WorkspaceSyncBridge`:
 *
 *   1. On first authenticated mount, pull server state.
 *   2. If the server has non-empty pins → it wins; replace the local store.
 *   3. If the server is empty AND localStorage has pins → migrate (POST).
 *   4. On every subsequent local mutation: PUT debounced 750ms.
 */
export function PinboardSyncBridge() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  // useState (not useRef) for the same reason as WorkspaceSyncBridge —
  // the push-subscribe effect must re-run after the async pull completes.
  const [hydratedFromServer, setHydratedFromServer] = useState(false);
  const lastPushedSignature = useRef<string>("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !userId || hydratedFromServer) return;
    let cancelled = false;
    (async () => {
      const remote = await pullPinboardFromServer();
      if (cancelled) return;
      const local = usePinboardStore.getState();
      const remoteHasPins = remote && Array.isArray(remote.pins) && remote.pins.length > 0;
      if (remoteHasPins && remote) {
        usePinboardStore.setState({
          enabled: remote.enabled,
          pins: [...remote.pins].sort((a, b) => a.order - b.order),
          hydrated: true,
        });
        lastPushedSignature.current = JSON.stringify({
          version: PINBOARD_SCHEMA_VERSION as 1,
          enabled: remote.enabled,
          pins: usePinboardStore.getState().pins,
        });
      } else if (local.pins.length > 0) {
        await migratePinboardToServer({
          version: PINBOARD_SCHEMA_VERSION,
          enabled: local.enabled,
          pins: local.pins,
        });
        lastPushedSignature.current = JSON.stringify({
          version: PINBOARD_SCHEMA_VERSION as 1,
          enabled: local.enabled,
          pins: local.pins,
        });
      }
      setHydratedFromServer(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [status, userId, hydratedFromServer]);

  useEffect(() => {
    if (status !== "authenticated" || !hydratedFromServer) return;
    const unsub = usePinboardStore.subscribe((s) => {
      const payload = {
        version: PINBOARD_SCHEMA_VERSION as 1,
        enabled: s.enabled,
        pins: s.pins,
      };
      const signature = JSON.stringify(payload);
      if (signature === lastPushedSignature.current) return;
      lastPushedSignature.current = signature;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        void pushPinboardToServer(payload);
      }, PUSH_DEBOUNCE_MS);
    });
    return () => {
      unsub();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [status, hydratedFromServer]);

  return null;
}
