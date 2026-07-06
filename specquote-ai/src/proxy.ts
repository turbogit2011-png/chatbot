import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/api/auth"];

/**
 * Optimistic check only (fast cookie presence test) — real session
 * verification + tenant scoping happens in the (app) layout and every
 * route handler via requireCurrentUser()/requireApiUser(). This just saves
 * a round trip by redirecting unauthenticated users before they hit a
 * protected page.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has("sq_session");

  if (!hasSession && !PUBLIC_PATHS.some((p) => pathname.startsWith(p)) && pathname !== "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
