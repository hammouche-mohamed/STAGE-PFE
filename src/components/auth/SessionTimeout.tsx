"use client";

import { useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

// NFR-S6: 5-minute idle timeout. Mirrors the JWT maxAge in auth.config.ts.
const TIMEOUT_MS = 5 * 60 * 1000;

export default function SessionTimeout() {
  const { status } = useSession();
  const pathname = usePathname();

  const handleLogout = useCallback(
    (reason: "idle" | "expired") => {
      const callbackUrl = pathname && pathname !== "/login" ? pathname : "/";
      signOut({
        callbackUrl: `/login?error=${reason === "idle" ? "SessionTimeout" : "SessionExpired"}&callbackUrl=${encodeURIComponent(callbackUrl)}`,
      });
    },
    [pathname],
  );

  // ── 1. Idle timer (client-side activity tracking) ──────────────────────────
  useEffect(() => {
    if (status !== "authenticated") return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => handleLogout("idle"), TIMEOUT_MS);
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];
    resetTimer();
    events.forEach((event) => window.addEventListener(event, resetTimer));

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [status, handleLogout]);

  // ── 2. Global 401 fetch interceptor ────────────────────────────────────────
  // When the JWT expires server-side, API calls return 401. Without this,
  // the UI silently shows empty data; with it, the user is redirected to
  // /login the moment a stale session is detected.
  useEffect(() => {
    if (status !== "authenticated") return;
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;
    let redirecting = false;

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await originalFetch(...args);

      // Only react to 401 from our own /api/* routes (not /api/auth which is
      // expected to 401 during normal sign-in flow).
      const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
      const isOurApi = url.includes("/api/") && !url.includes("/api/auth");

      if (response.status === 401 && isOurApi && !redirecting) {
        redirecting = true;
        handleLogout("expired");
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [status, handleLogout]);

  return null;
}
