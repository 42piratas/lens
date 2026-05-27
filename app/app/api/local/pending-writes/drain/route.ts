import { NextResponse } from "next/server";
import { authedRoute } from "@/lib/auth/route-wrapper";
import { getRouteSession } from "@/lib/auth/session";
import { processPendingWrite, type PendingItem } from "@/lib/auth/pending-writes-worker";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BATCH_LIMIT = 10;

/**
 * Drains the signed-in user's pending-writes queue for items whose
 * `next_attempt_at` has passed. Replaces the b02-05 client-side worker.
 *
 * Trigger pattern (v1): client polls this endpoint after enqueue + every
 * 30s as long as items remain. Polling is a thin trigger — the actual
 * processing + connector calls happen here, so retries survive tab close
 * (after the user reopens the tab).
 *
 * Cron upgrade path (Phase 3): wire a Supabase Edge Function on a
 * timer that posts directly with a service-role JWT on behalf of every
 * active user. This endpoint stays as the per-user trigger.
 */
export const POST = authedRoute(async (userId) => {
  const session = await getRouteSession();
  if (!session) {
    return NextResponse.json({ error: { kind: "auth", message: "Sign-in required" } }, { status: 401 });
  }
  const { supabase } = session;

  const { data: rows, error: selectErr } = await supabase
    .from("pending_writes")
    .select("id, user_id, connector, item, attempt, next_attempt_at, last_error")
    .eq("user_id", userId)
    .lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at", { ascending: true })
    .limit(BATCH_LIMIT);
  if (selectErr) return NextResponse.json({ error: selectErr.message }, { status: 500 });

  const items = (rows ?? []) as PendingItem[];
  const results: Array<{ id: string; status: "ok" | "retry" | "permanent"; reason?: string }> = [];

  for (const it of items) {
    const result = await processPendingWrite(it);
    if (result.kind === "ok") {
      await supabase.from("pending_writes").delete().eq("id", it.id);
      results.push({ id: it.id, status: "ok" });
    } else if (result.kind === "retry") {
      await supabase
        .from("pending_writes")
        .update({
          attempt: it.attempt + 1,
          next_attempt_at: result.nextAttemptAt.toISOString(),
          last_error: result.reason,
        })
        .eq("id", it.id);
      results.push({ id: it.id, status: "retry", reason: result.reason });
    } else {
      await supabase
        .from("pending_writes")
        .update({ last_error: result.reason })
        .eq("id", it.id);
      results.push({ id: it.id, status: "permanent", reason: result.reason });
    }
  }

  return NextResponse.json({ processed: results });
});
