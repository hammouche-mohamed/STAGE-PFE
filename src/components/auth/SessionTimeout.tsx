"use client";

import { useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";

// NFR-S6: 5-minute idle timeout. Mirrors the JWT maxAge in auth.config.ts.
const TIMEOUT_MS = 5 * 60 * 1000;

export default function SessionTimeout() {
  const { status } = useSession();

  const handleLogout = useCallback(
    async (reason: "idle" | "expired") => {
      // After idle/expired logout the user is sent to the public home page
      // (not the login page). The reason is passed as a query param so the
      // landing page can show a banner / toast if desired.
      const target = `/?logout=${reason === "idle" ? "idle" : "expired"}`;

      // Clear the session server-side without letting next-auth handle the
      // redirect — it does a soft SPA nav which keeps stale JS state and lets
      // the browser put the authenticated page into bfcache (so pressing
      // "Back" later visually restores it).
      await signOut({ redirect: false });

      // Hard navigation via location.replace:
      //  • forces a fresh document load (no stale csrf / session state)
      //  • replaces the history entry, so "Back" no longer returns to the
      //    authenticated route.
      window.location.replace(target);
    },
    [],
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
      // expected to 401 during normal sign-in flow). Fetch accepts
      // string | URL | Request — handle all three without throwing, so RSC
      // navigation (which passes a Request) isn't broken.
      const input = args[0];
      let url = "";
      if (typeof input === "string") {
        url = input;
      } else if (input instanceof URL) {
        url = input.href;
      } else if (input && typeof (input as Request).url === "string") {
        url = (input as Request).url;
      }
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
