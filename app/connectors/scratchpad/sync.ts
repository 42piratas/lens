"use client";

import type { ScratchpadState } from "./types";

const ENDPOINT = "/api/local/scratchpad";

export async function pullScratchpadFromServer(): Promise<ScratchpadState | null> {
  try {
    const res = await fetch(ENDPOINT, { cache: "no-store", credentials: "include" });
    if (!res.ok) return null;
    const json = (await res.json()) as { state?: ScratchpadState };
    return json.state ?? null;
  } catch {
    return null;
  }
}

export async function pushScratchpadToServer(state: ScratchpadState): Promise<void> {
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

export async function migrateScratchpadToServer(state: ScratchpadState): Promise<boolean> {
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
