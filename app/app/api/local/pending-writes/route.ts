import { NextResponse } from "next/server";
import { z } from "zod";
import { getRouteSession } from "@/lib/auth/session";

export const runtime = "nodejs";

const enqueueSchema = z.object({
  connector: z.string(),
  item: z.record(z.string(), z.unknown()),
});

const drainSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export async function GET() {
  const session = await getRouteSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await session.supabase
    .from("pending_writes")
    .select("id, connector, item, attempt, next_attempt_at, last_error, created_at")
    .eq("user_id", session.userId)
    .order("next_attempt_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

/** Enqueue a write. Caller is the optimistic-UI client, not the worker. */
export async function POST(req: Request) {
  const session = await getRouteSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = enqueueSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "schema mismatch", issues: parsed.error.issues }, { status: 422 });
  }
  const { data, error } = await session.supabase
    .from("pending_writes")
    .insert({
      user_id: session.userId,
      connector: parsed.data.connector,
      item: parsed.data.item,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

/** Drain the listed ids (used by sign-out cleanup or manual retry-all). */
export async function DELETE(req: Request) {
  const session = await getRouteSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = drainSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "schema mismatch", issues: parsed.error.issues }, { status: 422 });
  }
  const { error } = await session.supabase
    .from("pending_writes")
    .delete()
    .eq("user_id", session.userId)
    .in("id", parsed.data.ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
