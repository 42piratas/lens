import { NextResponse } from "next/server";
import { fetchNotifications } from "@/connectors/github/client";
import { IntegrationError } from "@/connectors/github/types";
import type { GhNotificationFilter } from "@/connectors/github/types";
import { authedRoute } from "@/lib/auth/route-wrapper";

export const dynamic = "force-dynamic";

function statusForKind(kind: IntegrationError["kind"]): number {
  if (kind === "auth") return 401;
  if (kind === "rate-limit") return 429;
  if (kind === "not-found") return 404;
  return 500;
}

const FILTERS: GhNotificationFilter[] = [
  "all",
  "participating",
  "mentions",
  "review-requested",
];

export const GET = authedRoute(async (_userId, request: Request) => {
  const url = new URL(request.url);
  const filterParam = url.searchParams.get("filter") as GhNotificationFilter | null;
  const filter: GhNotificationFilter =
    filterParam && FILTERS.includes(filterParam) ? filterParam : "all";
  const showRead = url.searchParams.get("showRead") === "1";
  try {
    const notifications = await fetchNotifications({ filter, showRead });
    return NextResponse.json({ data: { notifications } });
  } catch (err) {
    if (err instanceof IntegrationError) {
      return NextResponse.json(
        { error: { kind: err.kind, message: err.message } },
        { status: statusForKind(err.kind) },
      );
    }
    return NextResponse.json(
      { error: { kind: "unknown", message: (err as Error).message } },
      { status: 500 },
    );
  }
});
