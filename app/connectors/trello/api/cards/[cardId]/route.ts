import { NextResponse } from "next/server";
import { getCardDesc, updateCard } from "@/connectors/trello/client";
import { IntegrationError } from "@/connectors/trello/types";
import { authedRoute } from "@/lib/auth/route-wrapper";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ cardId: string }> };

function errorResponse(err: unknown) {
  if (err instanceof IntegrationError) {
    return NextResponse.json(
      { error: { kind: err.kind, message: err.message } },
      {
        status:
          err.kind === "auth"
            ? 401
            : err.kind === "rate-limit"
              ? 429
              : 500,
      },
    );
  }
  return NextResponse.json(
    { error: { kind: "unknown", message: (err as Error).message } },
    { status: 500 },
  );
}

export const PUT = authedRoute(async (_userId, request: Request, ctx: Params) => {
  const { cardId } = await ctx.params;
  if (!cardId) {
    return NextResponse.json(
      { error: { kind: "unknown", message: "cardId is required" } },
      { status: 400 },
    );
  }
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
  const desc = typeof b?.desc === "string" ? b.desc : null;
  const descAppend = typeof b?.descAppend === "string" ? b.descAppend : null;
  if (desc === null && descAppend === null) {
    return NextResponse.json(
      { error: { kind: "unknown", message: "desc or descAppend is required" } },
      { status: 400 },
    );
  }
  try {
    let nextDesc: string;
    if (descAppend !== null) {
      const existing = await getCardDesc(cardId);
      // Idempotent: skip if the appended block already trails the desc.
      if (existing.trimEnd().endsWith(descAppend)) {
        nextDesc = existing;
      } else {
        nextDesc = existing.trim().length > 0
          ? `${existing}\n\n${descAppend}`
          : descAppend;
      }
    } else {
      nextDesc = desc as string;
    }
    const out = await updateCard({ cardId, desc: nextDesc });
    return NextResponse.json({ card: out });
  } catch (err) {
    return errorResponse(err);
  }
});
