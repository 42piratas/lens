import { NextResponse } from "next/server";
import { getCell } from "@/connectors/google-sheets/client";
import { IntegrationError } from "@/connectors/google-sheets/types";
import { authedRoute } from "@/lib/auth/route-wrapper";

export const dynamic = "force-dynamic";

export const GET = authedRoute(async (_userId, request: Request) => {
  const url = new URL(request.url);
  const spreadsheetId = url.searchParams.get("spreadsheetId");
  const cell = url.searchParams.get("cell");
  if (!spreadsheetId || !cell) {
    return NextResponse.json(
      { error: { kind: "unknown", message: "spreadsheetId and cell are required" } },
      { status: 400 },
    );
  }
  try {
    const value = await getCell({ spreadsheetId, cell });
    return NextResponse.json({ value });
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
