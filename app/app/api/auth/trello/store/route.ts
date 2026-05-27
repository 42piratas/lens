import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { persistOAuthTokens } from "@/lib/auth/persist-oauth-tokens";

const bodySchema = z.object({ token: z.string().min(20) });

const TRELLO_VALIDATE = "https://api.trello.com/1/members/me";

/**
 * Validates a Trello token by hitting /1/members/me, then persists it
 * to oauth_tokens (vault-encrypted) keyed by the signed-in user. The
 * scope hint we record is `["read","write"]` (the scope the start
 * route requests) — Trello does not echo the granted scopes back.
 */
export async function POST(request: Request) {
  const session = (await auth()) as { user?: { id?: string } } | null;
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: { kind: "auth", message: "Sign-in required" } },
      { status: 401 },
    );
  }
  const apiKey = process.env.TRELLO_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: { kind: "config", message: "TRELLO_API_KEY is not configured" } },
      { status: 500 },
    );
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "missing token" }, { status: 422 });
  }
  const { token } = parsed.data;
  const url = new URL(TRELLO_VALIDATE);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("token", token);
  let res: Response;
  try {
    res = await fetch(url.toString(), { cache: "no-store" });
  } catch (err) {
    return NextResponse.json(
      { error: { kind: "network", message: (err as Error).message } },
      { status: 502 },
    );
  }
  if (!res.ok) {
    return NextResponse.json(
      { error: { kind: "auth", message: `Trello rejected the token (${res.status})` } },
      { status: 401 },
    );
  }
  await persistOAuthTokens({
    userId,
    provider: "trello",
    accessToken: token,
    refreshToken: null,
    expiresAt: null,
    scopes: ["read", "write"],
  });
  return NextResponse.json({ ok: true });
}
