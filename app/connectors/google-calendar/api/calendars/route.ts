import { NextResponse } from "next/server";
import { listCalendars } from "@/connectors/google-calendar/client";
import { IntegrationError } from "@/connectors/google-calendar/types";
import { authedRoute } from "@/lib/auth/route-wrapper";

export const dynamic = "force-dynamic";

export const GET = authedRoute(async () => {
  try {
    const calendars = await listCalendars();
    return NextResponse.json({ calendars });
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
