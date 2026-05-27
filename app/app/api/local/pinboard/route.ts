import { NextResponse } from "next/server";
import { getRouteSession } from "@/lib/auth/session";
import { EMPTY_PINBOARD_STATE, pinboardStateSchema, type PinboardState } from "@/lib/pinboard/schema";

export const runtime = "nodejs";

export async function GET() {
  const session = await getRouteSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await session.supabase
    .from("pinboards")
    .select("state")
    .eq("user_id", session.userId)
    .maybeSingle<{ state: PinboardState }>();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ state: data?.state ?? EMPTY_PINBOARD_STATE });
}

export async function PUT(req: Request) {
  const session = await getRouteSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = pinboardStateSchema.safeParse((payload as { state?: unknown })?.state ?? payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "schema mismatch", issues: parsed.error.issues }, { status: 422 });
  }
  const { error } = await session.supabase.from("pinboards").upsert(
    { user_id: session.userId, state: parsed.data },
    { onConflict: "user_id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/**
 * One-time client-side migration entry point. Refuses to overwrite an
 * existing non-empty pinboard (idempotent for repeated sign-ins).
 */
export async function POST(req: Request) {
  const session = await getRouteSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = pinboardStateSchema.safeParse((payload as { state?: unknown })?.state ?? payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "schema mismatch", issues: parsed.error.issues }, { status: 422 });
  }
  const { data: existing } = await session.supabase
    .from("pinboards")
    .select("state")
    .eq("user_id", session.userId)
    .maybeSingle<{ state: PinboardState }>();
  const hasPins =
    existing?.state && Array.isArray(existing.state.pins) && existing.state.pins.length > 0;
  if (hasPins) {
    return NextResponse.json({ ok: true, migrated: false, reason: "non-empty existing pinboard" });
  }
  const { error } = await session.supabase.from("pinboards").upsert(
    { user_id: session.userId, state: parsed.data },
    { onConflict: "user_id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, migrated: true });
}
