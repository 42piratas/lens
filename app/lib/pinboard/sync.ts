"use client";

import type { PinboardState } from "./schema";

const ENDPOINT = "/api/local/pinboard";

/**
 * GETs the signed-in user's pinboard envelope from Supabase.
 * Returns null on 401 or any error — caller falls back to localStorage.
 */
export async function pullPinboardFromServer(): Promise<PinboardState | null> {
  try {
    const res = await fetch(ENDPOINT, { cache: "no-store", credentials: "include" });
    if (!res.ok) return null;
    const json = (await res.json()) as { state?: PinboardState };
    return json.state ?? null;
  } catch {
    return null;
  }
}

/**
 * PUTs the canonical state back to the server. Fire-and-forget.
 */
export async function pushPinboardToServer(state: PinboardState): Promise<void> {
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
 * existing pinboard (idempotent for repeated sign-ins).
 */
export async function migratePinboardToServer(state: PinboardState): Promise<boolean> {
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
