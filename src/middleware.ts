import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * NFR-S1: Route-level authentication guard.
 * Protects all dashboard routes at the Edge before any page renders.
 * Falls back to /login for unauthenticated requests.
 */
export default auth((req) => {
  const { nextUrl, auth: session } = req as any;

  if (!session) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based route guards
  const role = session?.user?.role;
  const path = nextUrl.pathname;

  if (path.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", nextUrl.origin));
  }
  if (path.startsWith("/teacher") && role !== "TEACHER") {
    return NextResponse.redirect(new URL("/login", nextUrl.origin));
  }
  if (path.startsWith("/company") && role !== "COMPANY") {
    return NextResponse.redirect(new URL("/login", nextUrl.origin));
  }
  if (path.startsWith("/student") && role !== "STUDENT") {
    return NextResponse.redirect(new URL("/login", nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/teacher/:path*",
    "/company/:path*",
    "/student/:path*",
    "/profile/:path*",
    "/notifications/:path*",
    "/change-password/:path*",
  ],
};
