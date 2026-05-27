"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useWorkspaceStore } from "./store";
import { WORKSPACES_SCHEMA_VERSION } from "./schema";
import {
  migrateWorkspacesToServer,
  pullWorkspacesFromServer,
  pushWorkspacesToServer,
} from "./sync";

const PUSH_DEBOUNCE_MS = 750;

/**
 * Bidirectional bridge between the workspace store (localStorage cache)
 * and `public.layouts.state` (Supabase, the source of truth post b02-15).
 *
 * On first authenticated mount:
 *   1. Pulls server state.
 *   2. If the server has a non-empty envelope → it wins; replace the
 *      local store. (Survives sign-out → sign-in on a new browser.)
 *   3. If the server is empty AND localStorage has content → migrate
 *      (POST). Server refuses to overwrite, so this is idempotent.
 *
 * On every subsequent local mutation: PUT debounced 750ms.
 */
export function WorkspaceSyncBridge() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  // Why useState (not useRef): the push-subscribe effect must re-run after
  // the async pull completes. A ref flip doesn't trigger a render, so the
  // subscribe would never register on first authenticated mount — and every
  // local mutation would be silently dropped, with the next reload pulling
  // stale server state.
  const [hydratedFromServer, setHydratedFromServer] = useState(false);
  const lastPushedSignature = useRef<string>("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !userId || hydratedFromServer) return;
    let cancelled = false;
    (async () => {
      const remote = await pullWorkspacesFromServer();
      if (cancelled) return;
      const local = useWorkspaceStore.getState();
      const remoteHasContent =
        remote &&
        Array.isArray(remote.workspaces) &&
        remote.workspaces.some((w) => w.layout.length > 0);
      if (remoteHasContent && remote) {
        useWorkspaceStore.setState({
          activeId: remote.activeId ?? local.activeId,
          workspaces: remote.workspaces,
          hydrated: true,
        });
        // Seed the push-suppression signature so the immediate subscribe
        // firing (from setState above) doesn't echo the server payload
        // back as a redundant PUT.
        lastPushedSignature.current = JSON.stringify({
          version: WORKSPACES_SCHEMA_VERSION as 1,
          activeId: remote.activeId ?? local.activeId,
          workspaces: remote.workspaces,
        });
      } else if (local.workspaces.length > 0) {
        await migrateWorkspacesToServer({
          version: WORKSPACES_SCHEMA_VERSION,
          activeId: local.activeId,
          workspaces: local.workspaces,
        });
        lastPushedSignature.current = JSON.stringify({
          version: WORKSPACES_SCHEMA_VERSION as 1,
          activeId: local.activeId,
          workspaces: local.workspaces,
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
    const unsub = useWorkspaceStore.subscribe((s) => {
      const payload = {
        version: WORKSPACES_SCHEMA_VERSION as 1,
        activeId: s.activeId,
        workspaces: s.workspaces,
      };
      const signature = JSON.stringify(payload);
      if (signature === lastPushedSignature.current) return;
      lastPushedSignature.current = signature;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        void pushWorkspacesToServer(payload);
      }, PUSH_DEBOUNCE_MS);
    });
    return () => {
      unsub();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [status, hydratedFromServer]);

  return null;
}
