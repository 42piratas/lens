import "server-only";
import { getKeepAccessTokenFor, getKeepWorkspaceDomain } from "@/lib/auth/google-keep-sa";
import { getUserEmailOrThrow } from "@/lib/auth/user-context";
import { IntegrationError, type KeepLabel, type KeepNote } from "./types";

/**
 * Google Keep REST API v1 — read-only, service-account + DWD.
 *
 * Background: the Keep REST API is enterprise-only. It does not support
 * standard user-OAuth scope grants (the `keep.readonly` scope is not in
 * Google's OAuth 2.0 scopes catalog and not selectable on the consent
 * screen). The only documented path is a Workspace admin granting a
 * service account permission to impersonate users via domain-wide
 * delegation. See `lib/auth/google-keep-sa.ts` for the auth helper.
 *
 * - V1 exposes notes only (no `color`, no `pinned`, no labels endpoint).
 *   Color defaults to `WHITE` in the mapper — renders against the neutral
 *   note surface.
 * - Web URL synthesized as `https://keep.google.com/u/0/#NOTE/<id>` — works
 *   on keep.google.com for Workspace users.
 */

const API_BASE = "https://keep.googleapis.com/v1";
const CACHE_TTL_MS = 60_000;
const DEFAULT_PAGE_SIZE = 100;

type CacheEntry<T> = { value: T; expiresAt: number };

type GoogleNote = {
  name?: string;
  title?: string;
  createTime?: string;
  updateTime?: string;
  trashTime?: string;
  trashed?: boolean;
  body?: {
    text?: { text?: string };
    list?: { listItems?: Array<{ text?: { text?: string }; checked?: boolean }> };
  };
  labels?: Array<{ name?: string }>;
};

type ListNotesResponse = {
  notes?: GoogleNote[];
  nextPageToken?: string;
};

const notesCache = new Map<string, CacheEntry<KeepNote[]>>();
const labelsCache = new Map<string, CacheEntry<KeepLabel[]>>();

function cacheKey(userEmail: string, label: string | undefined): string {
  return `${userEmail}|${label ?? "__all__"}`;
}

function assertWorkspaceUser(userEmail: string): void {
  const allowed = getKeepWorkspaceDomain();
  if (!allowed) {
    throw new IntegrationError(
      "auth",
      "LENS_KEEP_WORKSPACE_DOMAIN not configured — Keep is admin-disabled.",
    );
  }
  const at = userEmail.lastIndexOf("@");
  const domain = at >= 0 ? userEmail.slice(at + 1).toLowerCase() : "";
  if (domain !== allowed.toLowerCase()) {
    throw new IntegrationError(
      "auth",
      `Keep is only available to ${allowed} accounts (signed in as ${userEmail}).`,
    );
  }
}

async function keepFetch<T>(userEmail: string, path: string): Promise<T> {
  const accessToken = await getKeepAccessTokenFor(userEmail);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch (err) {
    throw new IntegrationError("network", (err as Error).message);
  }
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 401) {
      throw new IntegrationError("auth", "Keep API 401 — SA token rejected");
    }
    if (res.status === 403) {
      throw new IntegrationError(
        "auth",
        "Keep API 403 — verify domain-wide delegation includes keep.readonly",
      );
    }
    if (res.status === 429) {
      throw new IntegrationError("rate-limit", "Keep API rate-limited");
    }
    throw new IntegrationError("unknown", `Keep API ${res.status}: ${text || res.statusText}`);
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

function noteIdFromName(name: string | undefined): string {
  if (!name) return "";
  return name.startsWith("notes/") ? name.slice("notes/".length) : name;
}

function flattenBody(body: GoogleNote["body"]): string {
  if (!body) return "";
  if (body.text?.text) return body.text.text;
  if (body.list?.listItems?.length) {
    return body.list.listItems
      .map((item) => `${item.checked ? "[x]" : "[ ]"} ${item.text?.text ?? ""}`.trim())
      .join("\n");
  }
  return "";
}

function labelNameFromResource(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const idx = name.lastIndexOf("/");
  const tail = idx >= 0 ? name.slice(idx + 1) : name;
  return tail.length > 0 ? tail : undefined;
}

function mapNote(n: GoogleNote): KeepNote {
  const id = noteIdFromName(n.name);
  return {
    id,
    title: n.title ?? "",
    text: flattenBody(n.body),
    color: "WHITE",
    pinned: false,
    labels: (n.labels ?? [])
      .map((l) => labelNameFromResource(l.name))
      .filter((s): s is string => Boolean(s)),
    edited: n.updateTime ?? n.createTime ?? null,
    url: id ? `https://keep.google.com/u/0/#NOTE/${id}` : "",
  };
}

function sortByUpdatedDesc(a: KeepNote, b: KeepNote): number {
  const ai = a.edited ? Date.parse(a.edited) : 0;
  const bi = b.edited ? Date.parse(b.edited) : 0;
  return bi - ai;
}

export async function listNotes({ label }: { label?: string } = {}): Promise<KeepNote[]> {
  const userEmail = getUserEmailOrThrow();
  assertWorkspaceUser(userEmail);
  const key = cacheKey(userEmail, label);
  const hit = notesCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const params = new URLSearchParams({ pageSize: String(DEFAULT_PAGE_SIZE) });
  if (label?.trim()) {
    params.set("filter", `labels.name="${label.trim()}"`);
  }
  const data = await keepFetch<ListNotesResponse>(userEmail, `/notes?${params.toString()}`);
  const notes = (data.notes ?? [])
    .filter((n) => !n.trashed)
    .map(mapNote)
    .sort(sortByUpdatedDesc);

  notesCache.set(key, { value: notes, expiresAt: Date.now() + CACHE_TTL_MS });
  return notes;
}

/**
 * Harvest the set of distinct label names from the user's most recent
 * notes. Keep API v1 does not expose a labels.list endpoint, so we sample
 * the first page of notes and dedupe label names.
 */
export async function listLabels(): Promise<KeepLabel[]> {
  const userEmail = getUserEmailOrThrow();
  assertWorkspaceUser(userEmail);
  const key = cacheKey(userEmail, "__labels__");
  const hit = labelsCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const data = await keepFetch<ListNotesResponse>(
    userEmail,
    `/notes?pageSize=${DEFAULT_PAGE_SIZE}`,
  );
  const seen = new Set<string>();
  const labels: KeepLabel[] = [];
  for (const n of data.notes ?? []) {
    for (const l of n.labels ?? []) {
      const name = labelNameFromResource(l.name);
      if (!name || seen.has(name)) continue;
      seen.add(name);
      labels.push({ id: name, name });
    }
  }
  labels.sort((a, b) => a.name.localeCompare(b.name));

  labelsCache.set(key, { value: labels, expiresAt: Date.now() + CACHE_TTL_MS });
  return labels;
}

export function _resetKeepCache() {
  notesCache.clear();
  labelsCache.clear();
}
