import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

/**
 * NFR-S1: Route-level authentication and role-based access control.
 * Restored to standard middleware.ts for Next.js 15 environment.
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const session = req.auth;

  const isPublicRoute = 
    nextUrl.pathname === "/login" ||
    nextUrl.pathname === "/register" ||
    nextUrl.pathname === "/reset-password" ||
    nextUrl.pathname === "/forgot-password";
  
  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isApiPublicRoute = (nextUrl.pathname === "/api/registrations" && req.method === "POST") || 
                           nextUrl.pathname.startsWith("/api/public");

  // 1. Allow API auth and public routes
  if (isApiAuthRoute || isApiPublicRoute) return NextResponse.next();

  // 2. Handle Entry Point (/) and Public Routes
  if (isPublicRoute || nextUrl.pathname === "/") {
    if (isLoggedIn) {
      const role = session?.user?.role;
      return NextResponse.redirect(new URL(`/${role?.toLowerCase() || ""}`, nextUrl));
    }
    return NextResponse.next();
  }

  // 3. Enforce Authentication
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Global Account Checks
  if (session?.user?.mustChangePassword && nextUrl.pathname !== "/reset-password") {
    return NextResponse.redirect(new URL("/reset-password", nextUrl));
  }

  if (!session?.user?.isActive) {
    return NextResponse.redirect(new URL("/login?error=Account deactivated", nextUrl));
  }

  // 5. Role-based Route Guards
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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.gif$|.*\\.webp$).*)"],
};
