import { NextResponse } from "next/server";
import {
  getEventDescription,
  listEvents,
  patchEvent,
} from "@/connectors/google-calendar/client";
import { IntegrationError } from "@/connectors/google-calendar/types";
import { authedRoute } from "@/lib/auth/route-wrapper";

export const dynamic = "force-dynamic";

export const GET = authedRoute(async (_userId, request: Request) => {
  const url = new URL(request.url);
  const calendarId = url.searchParams.get("calendarId");
  const timeMin = url.searchParams.get("timeMin");
  const timeMax = url.searchParams.get("timeMax");
  if (!calendarId || !timeMin || !timeMax) {
    return NextResponse.json(
      { error: { kind: "unknown", message: "calendarId, timeMin, timeMax are required" } },
      { status: 400 },
    );
  }
  try {
    const events = await listEvents({ calendarId, timeMin, timeMax });
    return NextResponse.json({ events });
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

export const PATCH = authedRoute(async (_userId, request: Request) => {
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
  const calendarId = typeof b?.calendarId === "string" ? b.calendarId : null;
  const eventId = typeof b?.eventId === "string" ? b.eventId : null;
  const colorId = typeof b?.colorId === "string" ? b.colorId : undefined;
  const descriptionPrefix =
    typeof b?.descriptionPrefix === "string" ? b.descriptionPrefix : undefined;
  const descriptionAppend =
    typeof b?.descriptionAppend === "string" ? b.descriptionAppend : undefined;
  const directDescription =
    typeof b?.description === "string" ? b.description : undefined;
  if (!calendarId || !eventId) {
    return NextResponse.json(
      { error: { kind: "unknown", message: "calendarId and eventId are required" } },
      { status: 400 },
    );
  }
  try {
    let description: string | undefined;
    if (typeof directDescription === "string") {
      description = directDescription;
    } else if (descriptionPrefix) {
      const existing = await getEventDescription({ calendarId, eventId });
      description = existing.includes(descriptionPrefix)
        ? existing
        : `${descriptionPrefix}\n\n${existing}`.trim();
    } else if (descriptionAppend) {
      const existing = await getEventDescription({ calendarId, eventId });
      // Idempotent — skip if the envelope already trails the description.
      if (existing.trimEnd().endsWith(descriptionAppend)) {
        description = existing;
      } else {
        description = existing.trim().length > 0
          ? `${existing}\n\n${descriptionAppend}`
          : descriptionAppend;
      }
    }
    const event = await patchEvent({ calendarId, eventId, colorId, description });
    return NextResponse.json({ event });
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
