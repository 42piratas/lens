import { NextResponse } from "next/server";
import { listTasksAcrossAll } from "@/connectors/google-tasks/client";
import { IntegrationError } from "@/connectors/google-tasks/types";
import { authedRoute } from "@/lib/auth/route-wrapper";

export const dynamic = "force-dynamic";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export const GET = authedRoute(async (_userId, request: Request) => {
  const url = new URL(request.url);
  const lookaheadParam = url.searchParams.get("lookaheadDays");
  const showHidden = url.searchParams.get("showHidden") === "1";
  const lookaheadDays = clamp(Number(lookaheadParam ?? 14) || 14, 1, 60);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + lookaheadDays * 24 * 60 * 60 * 1000);

  try {
    const tasks = await listTasksAcrossAll({
      showHidden,
      dueMin: start.toISOString(),
      dueMax: end.toISOString(),
    });
    return NextResponse.json({ tasks });
  } catch (err) {
    if (err instanceof IntegrationError) {
      return NextResponse.json(
        { error: { kind: err.kind, message: err.message } },
        { status: err.kind === "auth" ? 401 : err.kind === "rate-limit" ? 429 : 500 },
      );
    }
    return NextResponse.json(
      { error: { kind: "unknown", message: (err as Error).message } },
      { status: 500 },
    );
  }
});
