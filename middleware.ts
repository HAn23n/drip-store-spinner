import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, isValidSessionCookieValue } from "./lib/auth";

// Only the data API needs guarding. The /admin page itself is always
// reachable — it decides whether to show the password prompt or the editor
// based on whether this API returns 401, so there is no separate login page.
export const config = {
  matcher: ["/api/admin/prizes"],
};

export async function middleware(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const valid = await isValidSessionCookieValue(cookie);
  if (valid) return NextResponse.next();
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
