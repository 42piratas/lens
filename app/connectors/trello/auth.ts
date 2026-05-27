import "server-only";
import { IntegrationError } from "./types";
import { getUserIdOrThrow } from "@/lib/auth/user-context";
import { readOAuthTokens } from "@/lib/auth/persist-oauth-tokens";

const API = "https://api.trello.com/1";

async function readCreds(): Promise<{ key: string; token: string }> {
  const userId = getUserIdOrThrow();
  const sharedKey = process.env.TRELLO_API_KEY;
  if (!sharedKey) {
    throw new IntegrationError(
      "auth",
      "TRELLO_API_KEY not configured (the public app-key shared by every signed-in user).",
    );
  }
  const stored = await readOAuthTokens({ userId, provider: "trello" });
  if (!stored) {
    throw new IntegrationError(
      "auth",
      "Trello not connected. Connect Trello in /settings.",
    );
  }
  return { key: sharedKey, token: stored.accessToken };
}

export async function trelloFetch(
  path: string,
  params: Record<string, string> = {},
): Promise<unknown> {
  const { key, token } = await readCreds();
  const url = new URL(`${API}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", key);
  url.searchParams.set("token", token);
  let res: Response;
  try {
    res = await fetch(url.toString(), { cache: "no-store" });
  } catch (err) {
    throw new IntegrationError("network", (err as Error).message);
  }
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new IntegrationError("auth", `Trello API ${res.status}`);
    }
    if (res.status === 429) {
      throw new IntegrationError("rate-limit", "Trello API rate-limited");
    }
    throw new IntegrationError("unknown", `Trello API ${res.status}`);
  }
  return text ? JSON.parse(text) : {};
}

async function trelloWrite(
  method: "POST" | "PUT",
  path: string,
  body: Record<string, string>,
): Promise<unknown> {
  const { key, token } = await readCreds();
  const url = new URL(`${API}${path}`);
  url.searchParams.set("key", key);
  url.searchParams.set("token", token);
  const form = new URLSearchParams(body);
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      cache: "no-store",
    });
  } catch (err) {
    throw new IntegrationError("network", (err as Error).message);
  }
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new IntegrationError("auth", `Trello API ${res.status}`);
    }
    if (res.status === 429) {
      throw new IntegrationError("rate-limit", "Trello API rate-limited");
    }
    throw new IntegrationError("unknown", `Trello API ${res.status}`);
  }
  return text ? JSON.parse(text) : {};
}

/** POST against the Trello API (key+token in URL params, payload in body). */
export async function trelloPost(
  path: string,
  body: Record<string, string>,
): Promise<unknown> {
  return trelloWrite("POST", path, body);
}

/** PUT against the Trello API (key+token in URL params, payload in body). */
export async function trelloPut(
  path: string,
  body: Record<string, string>,
): Promise<unknown> {
  return trelloWrite("PUT", path, body);
}
