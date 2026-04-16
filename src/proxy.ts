import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const proxy = auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isPublicRoute = 
    nextUrl.pathname === "/" ||
    nextUrl.pathname === "/login" ||
    nextUrl.pathname === "/register" ||
    nextUrl.pathname === "/reset-password";
  
  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isApiPublicRoute = nextUrl.pathname === "/api/registrations" && req.method === "POST";

  if (isApiAuthRoute || isApiPublicRoute) return NextResponse.next();

  if (isPublicRoute) {
    if (isLoggedIn) {
      const role = req.auth?.user?.role;
      return NextResponse.redirect(new URL(`/${role?.toLowerCase() || ""}`, nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // Enforce password change if required
  if (req.auth?.user?.mustChangePassword && nextUrl.pathname !== "/reset-password") {
    return NextResponse.redirect(new URL("/reset-password", nextUrl));
  }

  // Active check
  if (!req.auth?.user?.isActive) {
    // Should probably redirect to a "Deactivated/Pending" page or back to login with error
    return NextResponse.redirect(new URL("/login?error=Account deactivated", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
