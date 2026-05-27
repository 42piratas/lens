import { NextResponse } from "next/server";
import { listTasklists, listTasks } from "@/connectors/google-tasks/client";
import { IntegrationError } from "@/connectors/google-tasks/types";
import { authedRoute } from "@/lib/auth/route-wrapper";

export const dynamic = "force-dynamic";

export const GET = authedRoute(async (_userId, request: Request) => {
  const url = new URL(request.url);
  const tasklistId = url.searchParams.get("tasklistId");
  if (!tasklistId) {
    return NextResponse.json(
      { error: { kind: "unknown", message: "tasklistId is required" } },
      { status: 400 },
    );
  }
  const showCompleted = url.searchParams.get("showCompleted") === "1";
  const showHidden = url.searchParams.get("showHidden") === "1";
  try {
    const [lists, tasks] = await Promise.all([
      listTasklists(),
      listTasks({ tasklistId, showCompleted, showHidden }),
    ]);
    const title = lists.find((l) => l.id === tasklistId)?.title ?? "";
    const tasksWithTitle = tasks.map((t) => ({ ...t, tasklistTitle: title }));
    return NextResponse.json({ tasks: tasksWithTitle });
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
