import { NextResponse } from "next/server";
import { z } from "zod";
import { getRouteSession } from "@/lib/auth/session";

export const runtime = "nodejs";

const boundSourceSchema = z
  .object({
    connector: z.string(),
    sourceId: z.string(),
    sourceTitle: z.string(),
    parentTitle: z.string().optional(),
    originalContent: z.string(),
    href: z.string().optional(),
    meta: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();

const scratchpadStateSchema = z.object({
  version: z.literal(2),
  binding: boundSourceSchema.nullable(),
  content: z.string(),
});

type ScratchpadState = z.infer<typeof scratchpadStateSchema>;
const EMPTY_STATE: ScratchpadState = { version: 2, binding: null, content: "" };

function isEmpty(state: ScratchpadState): boolean {
  return state.binding === null && state.content.length === 0;
}

export async function GET() {
  const session = await getRouteSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await session.supabase
    .from("scratchpad")
    .select("state")
    .eq("user_id", session.userId)
    .maybeSingle<{ state: ScratchpadState }>();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ state: data?.state ?? EMPTY_STATE });
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
  const parsed = scratchpadStateSchema.safeParse((payload as { state?: unknown })?.state ?? payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "schema mismatch", issues: parsed.error.issues }, { status: 422 });
  }
  const { error } = await session.supabase.from("scratchpad").upsert(
    { user_id: session.userId, state: parsed.data },
    { onConflict: "user_id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const session = await getRouteSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = scratchpadStateSchema.safeParse((payload as { state?: unknown })?.state ?? payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "schema mismatch", issues: parsed.error.issues }, { status: 422 });
  }
  const { data: existing } = await session.supabase
    .from("scratchpad")
    .select("state")
    .eq("user_id", session.userId)
    .maybeSingle<{ state: ScratchpadState }>();
  if (existing?.state && !isEmpty(existing.state)) {
    return NextResponse.json({ ok: true, migrated: false, reason: "non-empty existing scratchpad" });
  }
  const { error } = await session.supabase.from("scratchpad").upsert(
    { user_id: session.userId, state: parsed.data },
    { onConflict: "user_id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, migrated: true });
}
