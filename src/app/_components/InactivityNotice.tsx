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

    const message =
      reason === "idle"
        ? t("auth.idleLogout", {
            defaultValue:
              "You were logged out due to inactivity. Please sign in again.",
          } as any)
        : t("errors.sessionExpired");

    toast.warning(message, { duration: 6000 });

    // Strip the param so refresh/back doesn't show it again.
    const url = new URL(window.location.href);
    url.searchParams.delete("logout");
    window.history.replaceState({}, "", url.pathname + url.search);
  }, [params, t]);

  return null;
}
