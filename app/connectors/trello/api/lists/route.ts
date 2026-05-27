import { NextResponse } from "next/server";
import { listLists } from "@/connectors/trello/client";
import { IntegrationError } from "@/connectors/trello/types";
import { authedRoute } from "@/lib/auth/route-wrapper";

export const dynamic = "force-dynamic";

export const GET = authedRoute(async (_userId, request: Request) => {
  const url = new URL(request.url);
  const boardId = url.searchParams.get("boardId");
  if (!boardId) {
    return NextResponse.json(
      { error: { kind: "unknown", message: "boardId is required" } },
      { status: 400 },
    );
  }
  try {
    const lists = await listLists(boardId);
    return NextResponse.json({ lists });
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
