import { NextResponse } from "next/server";
import { getSheetMetadata } from "@/connectors/google-sheets/client";
import { IntegrationError } from "@/connectors/google-sheets/types";
import { authedRoute } from "@/lib/auth/route-wrapper";

export const dynamic = "force-dynamic";

export const GET = authedRoute(async (_userId, request: Request) => {
  const url = new URL(request.url);
  const spreadsheetId = url.searchParams.get("spreadsheetId");
  if (!spreadsheetId) {
    return NextResponse.json(
      { error: { kind: "unknown", message: "spreadsheetId is required" } },
      { status: 400 },
    );
  }
  try {
    const data = await getSheetMetadata(spreadsheetId);
    return NextResponse.json({ data });
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
