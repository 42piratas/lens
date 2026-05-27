import { NextResponse } from "next/server";
import { auth } from "@/auth";

const TRELLO_AUTH_URL = "https://trello.com/1/authorize";
const APP_NAME = "LENS";

/**
 * Initiates Trello's fragment-token flow. Redirects the user to Trello
 * with our public app key + the callback URL; Trello returns the user
 * to /trello-callback?#token=… on authorize. The client-side callback
 * page reads the fragment and POSTs to /api/auth/trello/store.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    const url = new URL("/sign-in", request.url);
    return NextResponse.redirect(url);
  }
  const apiKey = process.env.TRELLO_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: { kind: "config", message: "TRELLO_API_KEY is not configured" } },
      { status: 500 },
    );
  }
  const origin = new URL(request.url).origin;
  const returnUrl = `${origin}/trello-callback`;
  const params = new URLSearchParams({
    key: apiKey,
    name: APP_NAME,
    scope: "read,write",
    expiration: "never",
    response_type: "token",
    callback_method: "fragment",
    return_url: returnUrl,
  });
  const target = `${TRELLO_AUTH_URL}?${params.toString()}`;
  return NextResponse.redirect(target);
}
