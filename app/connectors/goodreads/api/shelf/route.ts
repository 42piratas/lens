import { NextResponse } from "next/server";
import { listShelfBooks } from "@/connectors/goodreads/client";
import { IntegrationError } from "@/connectors/_shared/integration-error";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const shelfName = url.searchParams.get("shelfName");
  const limitParam = url.searchParams.get("limit");
  if (!userId || !shelfName) {
    return NextResponse.json(
      { error: { kind: "unknown", message: "userId and shelfName are required" } },
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
    const data = await listShelfBooks({ userId, shelfName, limit });
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
}
