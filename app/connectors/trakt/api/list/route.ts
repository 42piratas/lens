import { NextResponse } from "next/server";
import { getList, getListItems } from "@/connectors/trakt/client";
import { IntegrationError } from "@/connectors/_shared/integration-error";

export const dynamic = "force-dynamic";

function statusForKind(kind: IntegrationError["kind"]): number {
  if (kind === "auth") return 401;
  if (kind === "rate-limit") return 429;
  return 500;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const username = url.searchParams.get("username");
  const slug = url.searchParams.get("slug");
  const metaOnly = url.searchParams.get("metaOnly") === "1";
  const limitParam = url.searchParams.get("limit");
  if (!username || !slug) {
    return NextResponse.json(
      { error: { kind: "unknown", message: "username and slug are required" } },
      { status: 400 },
    );
  }
  let limit: number | undefined;
  if (limitParam !== null) {
    const n = Number(limitParam);
    if (!Number.isFinite(n) || n < 1 || n > 50) {
      return NextResponse.json(
        { error: { kind: "unknown", message: "limit must be 1-50" } },
        { status: 400 },
      );
    }
    limit = n;
  }
  try {
    if (metaOnly) {
      const meta = await getList({ username, slug });
      return NextResponse.json({ data: { meta } });
    }
    const [meta, items] = await Promise.all([
      getList({ username, slug }),
      getListItems({ username, slug, limit }),
    ]);
    return NextResponse.json({ data: { meta, items } });
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
}
