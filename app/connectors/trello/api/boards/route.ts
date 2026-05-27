import { NextResponse } from "next/server";
import { listBoards } from "@/connectors/trello/client";
import { IntegrationError } from "@/connectors/trello/types";
import { authedRoute } from "@/lib/auth/route-wrapper";

export const dynamic = "force-dynamic";

export const GET = authedRoute(async () => {
  try {
    const boards = await listBoards();
    return NextResponse.json({ boards });
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
