"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/LanguageContext";

/**
 * Shows a toast when the user lands on "/" after an inactivity / expiry
 * logout. SessionTimeout redirects to `/?logout=idle` (or `expired`); this
 * reads that param, notifies, then strips it so a refresh won't re-fire.
 *
 * The effect runs ONCE on mount (empty deps). It must not depend on `t` or
 * `useSearchParams()` — those change identity on re-render, which would tear
 * down the click-to-dismiss listeners and never re-attach them.
 */
export default function InactivityNotice() {
  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    const reason =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("logout")
        : null;
    if (reason !== "idle" && reason !== "expired") return;

    // t() returns the raw key path when a key is missing — guard against
    // ever displaying "auth.idleLogout".
    const resolve = (key: string, fallback: string) => {
      const val = tRef.current(key as any);
      return !val || val === key ? fallback : val;
    };

    const message =
      reason === "idle"
        ? resolve(
            "auth.idleLogout",
            "You were signed out after 5 minutes of inactivity. Please sign in again.",
          )
        : resolve(
            "errors.sessionExpired",
            "Your session has expired. Please sign in again to continue.",
          );

    const TOAST_ID = "inactivity-logout";
    toast.warning(message, { duration: 8000, dismissible: true, id: TOAST_ID });

    // Strip the param so a refresh/back doesn't replay it.
    const url = new URL(window.location.href);
    url.searchParams.delete("logout");
    window.history.replaceState({}, "", url.pathname + url.search);

    // Dismiss on the first user interaction anywhere on the page.
    const dismiss = () => {
      toast.dismiss(TOAST_ID);
      cleanup();
    };
    const cleanup = () => {
      window.removeEventListener("pointerdown", dismiss, true);
      window.removeEventListener("keydown", dismiss, true);
    };
    // Defer one tick so the click/navigation that landed here doesn't
    // instantly close it. Capture phase so it fires even if something
    // stops propagation.
    const timer = setTimeout(() => {
      window.addEventListener("pointerdown", dismiss, true);
      window.addEventListener("keydown", dismiss, true);
    }, 50);

    return () => {
      clearTimeout(timer);
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
