import { NextResponse } from "next/server";
import { fetchPrs } from "@/connectors/github/client";
import { IntegrationError } from "@/connectors/github/types";
import type { GhPrFilter } from "@/connectors/github/types";
import { authedRoute } from "@/lib/auth/route-wrapper";

export const dynamic = "force-dynamic";

function statusForKind(kind: IntegrationError["kind"]): number {
  if (kind === "auth") return 401;
  if (kind === "rate-limit") return 429;
  if (kind === "not-found") return 404;
  return 500;
}

const FILTERS: GhPrFilter[] = [
  "assigned",
  "review-requested",
  "authored",
  "involves-me",
];

export const GET = authedRoute(async (_userId, request: Request) => {
  const url = new URL(request.url);
  const filterParam = url.searchParams.get("filter") as GhPrFilter | null;
  const filter: GhPrFilter =
    filterParam && FILTERS.includes(filterParam) ? filterParam : "involves-me";
  const repo = url.searchParams.get("repo") ?? undefined;
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;
  try {
    const prs = await fetchPrs({ filter, repo, limit });
    return NextResponse.json({ data: { prs } });
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
