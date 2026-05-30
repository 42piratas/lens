import { NextResponse } from "next/server";
import { fetchIssues } from "@/connectors/github/client";
import { IntegrationError } from "@/connectors/github/types";
import type { GhIssueState } from "@/connectors/github/types";
import { authedRoute } from "@/lib/auth/route-wrapper";

export const dynamic = "force-dynamic";

function statusForKind(kind: IntegrationError["kind"]): number {
  if (kind === "auth") return 401;
  if (kind === "rate-limit") return 429;
  if (kind === "not-found") return 404;
  return 500;
}

const STATES: GhIssueState[] = ["open", "closed", "all"];

export const GET = authedRoute(async (_userId, request: Request) => {
  const url = new URL(request.url);
  const repo = url.searchParams.get("repo") ?? undefined;
  const org = url.searchParams.get("org") ?? undefined;
  if (!repo && !org) {
    return NextResponse.json(
      { error: { kind: "unknown", message: "repo or org is required" } },
      { status: 400 },
    );
  }
  const stateParam = url.searchParams.get("state") as GhIssueState | null;
  const state: GhIssueState =
    stateParam && STATES.includes(stateParam) ? stateParam : "open";
  const labelsParam = url.searchParams.get("labels");
  const labels = labelsParam
    ? labelsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;
  const assignee = url.searchParams.get("assignee") ?? undefined;
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;
  try {
    const issues = await fetchIssues({ repo, org, state, labels, assignee, limit });
    return NextResponse.json({ data: { issues } });
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
