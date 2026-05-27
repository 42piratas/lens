import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { deleteOAuthTokens } from "@/lib/auth/persist-oauth-tokens";

type Provider = "google" | "trello";

/**
 * Returns the connected providers for the signed-in user. Token plaintext
 * never crosses the wire — only existence + expiry + scope hint.
 */
export async function GET() {
  const session = (await auth()) as { user?: { id?: string } } | null;
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: { kind: "auth", message: "Sign-in required" } },
      { status: 401 },
    );
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("oauth_tokens")
    .select("provider, expires_at, scopes, updated_at")
    .eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    connections: data ?? [],
  });
}

/**
 * Disconnects a provider — vault secrets are erased and the row is deleted.
 * The Auth.js session is preserved so the user can reconnect from /settings.
 */
export async function DELETE(request: Request) {
  const session = (await auth()) as { user?: { id?: string } } | null;
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: { kind: "auth", message: "Sign-in required" } },
      { status: 401 },
    );
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const provider = (payload as { provider?: string } | null)?.provider as Provider | undefined;
  if (provider !== "google" && provider !== "trello") {
    return NextResponse.json({ error: "invalid provider" }, { status: 422 });
  }
  await deleteOAuthTokens({ userId, provider });
  return NextResponse.json({ ok: true });
}
