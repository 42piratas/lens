import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PUBLIC_PAGES = new Set(["/sign-in"]);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static")
  ) {
    return NextResponse.next();
  }

  if (req.auth) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: { kind: "auth", message: "Sign-in required" } },
      { status: 401 },
    );
  }

  if (PUBLIC_PAGES.has(pathname)) return NextResponse.next();

  const url = new URL("/sign-in", req.nextUrl.origin);
  url.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(url);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png).*)"],
};
