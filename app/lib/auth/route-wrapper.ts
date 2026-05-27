import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { withUser } from "./user-context";

/**
 * Wraps a connector route handler so its body executes inside a
 * `withUser({userId, email})` scope. The wrapped handler receives `userId`
 * as its first arg; the rest of the route-handler signature is preserved.
 *
 * Returns 401 JSON when the session is missing — the connector
 * IntegrationError envelope shape (`{ error: { kind: 'auth', message } }`)
 * is preserved so existing client error-handling keeps working.
 */
export function authedRoute<TArgs extends unknown[]>(
  handler: (userId: string, ...args: TArgs) => Promise<NextResponse>,
): (...args: TArgs) => Promise<NextResponse> {
  return async (...args: TArgs): Promise<NextResponse> => {
    const session = (await auth()) as
      | { user?: { id?: string; email?: string | null } }
      | null;
    const userId = session?.user?.id;
    const email = session?.user?.email ?? null;
    if (!userId) {
      return NextResponse.json(
        { error: { kind: "auth", message: "Sign-in required" } },
        { status: 401 },
      );
    }
    return await withUser({ userId, email }, () => handler(userId, ...args));
  };
}
