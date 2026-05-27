import { NextResponse } from "next/server";
import { z } from "zod";
import { getRouteSession } from "@/lib/auth/session";

export const runtime = "nodejs";

const layoutCardSchema = z
  .object({
    id: z.string(),
    connector: z.string(),
    tile: z.string(),
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    w: z.number().int().min(1),
    h: z.number().int().min(1),
    config: z.record(z.string(), z.unknown()).default({}),
  })
  .passthrough();

const workspaceSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    icon: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
    theme: z.string(),
    layout: z.array(layoutCardSchema),
  })
  .passthrough();

const layoutStateSchema = z.object({
  version: z.literal(1),
  activeId: z.string().nullable(),
  workspaces: z.array(workspaceSchema),
});

type LayoutState = z.infer<typeof layoutStateSchema>;

const EMPTY_STATE: LayoutState = { version: 1, activeId: null, workspaces: [] };

export async function GET() {
  const session = await getRouteSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await session.supabase
    .from("layouts")
    .select("state")
    .eq("user_id", session.userId)
    .maybeSingle<{ state: LayoutState }>();
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
  const parsed = layoutStateSchema.safeParse((payload as { state?: unknown })?.state ?? payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "schema mismatch", issues: parsed.error.issues }, { status: 422 });
  }
  const { error } = await session.supabase.from("layouts").upsert(
    { user_id: session.userId, state: parsed.data },
    { onConflict: "user_id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/**
 * One-time client-side migration entry point. Refuses to overwrite an
 * existing non-empty layout (idempotent for repeated sign-ins).
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
  const parsed = layoutStateSchema.safeParse((payload as { state?: unknown })?.state ?? payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "schema mismatch", issues: parsed.error.issues }, { status: 422 });
  }
  const { data: existing } = await session.supabase
    .from("layouts")
    .select("state")
    .eq("user_id", session.userId)
    .maybeSingle<{ state: LayoutState }>();
  const hasContent =
    existing?.state &&
    Array.isArray(existing.state.workspaces) &&
    existing.state.workspaces.some((w) => w.layout.length > 0);
  if (hasContent) {
    return NextResponse.json({ ok: true, migrated: false, reason: "non-empty existing layout" });
  }
  const { error } = await session.supabase.from("layouts").upsert(
    { user_id: session.userId, state: parsed.data },
    { onConflict: "user_id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, migrated: true });
}
