"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/LanguageContext";

/**
 * Shows a toast when the user lands on "/" after an inactivity / expiry
 * logout. SessionTimeout redirects to `/?logout=idle` (or `expired`); this
 * reads that param, notifies, then strips it so a refresh won't re-fire.
 */
export default function InactivityNotice() {
  const params = useSearchParams();
  const { t } = useTranslation();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    const reason = params.get("logout");
    if (reason !== "idle" && reason !== "expired") return;
    shown.current = true;

    // The app's t() returns the raw key path when a key is missing and has
    // no defaultValue support — so guard against ever showing "auth.idleLogout".
    const resolve = (key: string, fallback: string) => {
      const val = t(key as any);
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

    toast.warning(message, {
      duration: 7000,
      dismissible: true,
      id: "inactivity-logout",
    });

    // Strip the param so refresh/back doesn't show it again.
    const url = new URL(window.location.href);
    url.searchParams.delete("logout");
    window.history.replaceState({}, "", url.pathname + url.search);
  }, [params, t]);

  return null;
}
