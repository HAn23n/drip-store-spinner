import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, isValidSessionCookieValue } from "./lib/auth";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/prizes"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The login page itself must stay reachable.
  if (pathname === "/admin/login") return NextResponse.next();

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const valid = await isValidSessionCookieValue(cookie);
  if (valid) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}
