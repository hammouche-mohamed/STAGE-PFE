"use client";

import React from "react";
import { SWRConfig } from "swr";

/**
 * Why this exists
 * ---------------
 * Every dashboard page used to fetch in `useEffect` with its own `useState`,
 * so navigating away and back re-hit the remote Aiven DB from scratch and the
 * user stared at a blank screen for ~1–1.5 s every single time.
 *
 * SWR keeps a module-level cache, so the *second* time a page is opened the
 * data is shown instantly while it revalidates in the background
 * (stale-while-revalidate). On top of that we persist the cache to
 * `sessionStorage`, so even a full page reload shows the last data immediately
 * instead of a blank screen.
 *
 * `sessionStorage` (not `localStorage`) is deliberate: it is per-tab and
 * cleared when the tab closes, so cached data never leaks to the next person
 * on a shared lab machine, while still surviving reloads within a session.
 */

const CACHE_KEY = "esst-swr-cache-v1";

function makeCacheProvider(): Map<string, any> {
  // SSR / first server render — no storage available.
  if (typeof window === "undefined") return new Map();

  let map = new Map<string, any>();
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (raw) map = new Map(JSON.parse(raw));
  } catch {
    // Corrupt or oversized cache — start clean.
    map = new Map();
  }

  // Flush the in-memory cache back to sessionStorage when the tab is hidden
  // or closed. `visibilitychange` covers mobile / tab-switch where
  // `beforeunload` is unreliable.
  const flush = () => {
    try {
      window.sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify(Array.from(map.entries())),
      );
    } catch {
      // Quota exceeded — drop the persisted copy, in-memory cache still works.
      try {
        window.sessionStorage.removeItem(CACHE_KEY);
      } catch {
        /* ignore */
      }
    }
  };

  window.addEventListener("beforeunload", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });

  // Wipe persisted cache on logout so the next account on this tab starts
  // clean. Dispatched from the auth/sign-out flow.
  window.addEventListener("esst:logout", () => {
    try {
      window.sessionStorage.removeItem(CACHE_KEY);
    } catch {
      /* ignore */
    }
    map.clear();
  });

  return map;
}

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        provider: makeCacheProvider,
        // Show cached data instantly, revalidate quietly in the background.
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        // Collapse duplicate requests fired within 5 s (e.g. several widgets
        // asking for the same endpoint on mount).
        dedupingInterval: 5_000,
        // Keep the old data on screen while a new request (filter change,
        // pagination) is in flight — no flash of empty state.
        keepPreviousData: true,
        errorRetryCount: 2,
        // The existing 30 s PollingProvider already tells pages when data
        // changed, so SWR itself does not poll.
        refreshInterval: 0,
      }}
    >
      {children}
    </SWRConfig>
  );
}
