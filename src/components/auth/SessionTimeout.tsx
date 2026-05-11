"use client";

import { useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";

const TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

export default function SessionTimeout() {
  const { data: session } = useSession();

  const handleLogout = useCallback(() => {
    signOut({ callbackUrl: "/login?error=SessionExpired" });
  }, []);

  useEffect(() => {
    if (!session) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleLogout, TIMEOUT_MS);
    };

    // Events to track user activity
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    // Initialize timer
    resetTimer();

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Cleanup
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [session, handleLogout]);

  return null;
}
