"use client";

import type { WorkspacesState } from "./schema";

const ENDPOINT = "/api/local/layout";

/**
 * GETs the signed-in user's saved workspaces envelope from Supabase.
 * Returns null on 401 (unauthed) or any error — caller should fall back
 * to localStorage.
 */
export async function pullWorkspacesFromServer(): Promise<WorkspacesState | null> {
  try {
    const res = await fetch(ENDPOINT, { cache: "no-store", credentials: "include" });
    if (!res.ok) return null;
    const json = (await res.json()) as { state?: WorkspacesState };
    return json.state ?? null;
  } catch {
    return null;
  }
}

/**
 * PUTs the canonical state back to the server. Fire-and-forget; failures
 * are dropped silently — the client cache (localStorage) keeps the user's
 * dashboard usable, and the next successful PUT covers the difference.
 */
export async function pushWorkspacesToServer(state: WorkspacesState): Promise<void> {
  try {
    await fetch(ENDPOINT, {
      method: "PUT",
      cache: "no-store",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    });
  } catch {
    /* swallow */
  }
}

/**
 * One-time migration POST. Server refuses to overwrite a non-empty
 * existing layout; idempotent across repeated sign-ins.
 */
export async function migrateWorkspacesToServer(state: WorkspacesState): Promise<boolean> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      cache: "no-store",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { migrated?: boolean };
    return Boolean(json.migrated);
  } catch {
    return false;
  }
}
