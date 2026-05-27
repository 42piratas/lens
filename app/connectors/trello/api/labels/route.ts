import { NextResponse } from "next/server";
import {
  applyLabelToCard,
  ensureBoardLabel,
  listBoardLabels,
} from "@/connectors/trello/client";
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
    const labels = await listBoardLabels(boardId);
    return NextResponse.json({ labels });
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

export const POST = authedRoute(async (_userId, request: Request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { kind: "unknown", message: "invalid json body" } },
      { status: 400 },
    );
  }
  const b = body as Record<string, unknown> | null;
  const boardId = typeof b?.boardId === "string" ? b.boardId : null;
  const name = typeof b?.name === "string" ? b.name.trim() : "";
  const color = typeof b?.color === "string" ? b.color : undefined;
  const cardId = typeof b?.cardId === "string" ? b.cardId : null;
  if (!boardId || !name) {
    return NextResponse.json(
      { error: { kind: "unknown", message: "boardId and name are required" } },
      { status: 400 },
    );
  }
  try {
    const label = await ensureBoardLabel({ boardId, name, color });
    if (cardId) {
      await applyLabelToCard({ cardId, labelId: label.id });
    }
    return NextResponse.json({ label, applied: Boolean(cardId) });
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
