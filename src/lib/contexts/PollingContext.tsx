"use client";

import React, { createContext, useContext, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Domain =
  | "notifications"
  | "profile"
  | "users"
  | "topics"
  | "internships"
  | "registrations"
  | "applications"
  | "invitations";

type Timestamps = Partial<Record<Domain, string | null>>;
type ChangeCallback = () => void;

interface PollingContextValue {
  /** Current domain timestamps from the latest poll */
  timestamps: Timestamps;
  /** Register a callback to fire when the given domain(s) change */
  subscribe: (domains: Domain | Domain[], callback: ChangeCallback) => () => void;
  /** Force an immediate poll (useful after a local mutation) */
  refresh: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const PollingContext = createContext<PollingContextValue>({
  timestamps: {},
  subscribe: () => () => {},
  refresh: () => {},
});

export const usePolling = () => useContext(PollingContext);

// ─── Hook: subscribe to specific domain changes ───────────────────────────────

/**
 * Convenience hook — runs `callback` whenever any of the listed domains
 * receive a new timestamp from the server.
 *
 * Usage:
 *   usePollingRefresh("users", fetchUsers);
 *   usePollingRefresh(["topics", "internships"], loadData);
 */
export function usePollingRefresh(
  domains: Domain | Domain[],
  callback: ChangeCallback,
) {
  const { subscribe } = usePolling();

  useEffect(() => {
    const unsubscribe = subscribe(domains, callback);
    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 30_000; // 30 seconds

export function PollingProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [timestamps, setTimestamps] = React.useState<Timestamps>({});

  // Registry: domain → Set of callbacks
  const listenersRef = useRef<Map<Domain, Set<ChangeCallback>>>(new Map());
  // Previous timestamps for comparison
  const prevTimestampsRef = useRef<Timestamps>({});

  // ── Subscribe ────────────────────────────────────────────────────────────
  const subscribe = useCallback(
    (domains: Domain | Domain[], callback: ChangeCallback): (() => void) => {
      const domainList = Array.isArray(domains) ? domains : [domains];

      domainList.forEach((domain) => {
        if (!listenersRef.current.has(domain)) {
          listenersRef.current.set(domain, new Set());
        }
        listenersRef.current.get(domain)!.add(callback);
      });

      // Return unsubscribe function
      return () => {
        domainList.forEach((domain) => {
          listenersRef.current.get(domain)?.delete(callback);
        });
      };
    },
    [],
  );

  // ── Poll ─────────────────────────────────────────────────────────────────
  const doPoll = useCallback(async () => {
    if (status !== "authenticated") return;
    // Don't hit the DB when the tab isn't visible — saves money on Aiven
    // and avoids waking the laptop just to refresh a hidden tab.
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

    try {
      const res = await fetch("/api/poll", { cache: "no-store" });
      if (!res.ok) return;

      const { timestamps: newTs }: { timestamps: Timestamps } = await res.json();

      // Determine which domains actually changed
      const changedDomains: Domain[] = [];
      const prev = prevTimestampsRef.current;

      (Object.keys(newTs) as Domain[]).forEach((domain) => {
        if (newTs[domain] && newTs[domain] !== prev[domain]) {
          changedDomains.push(domain);
        }
      });

      // Update state and ref
      prevTimestampsRef.current = newTs;
      setTimestamps(newTs);

      // Fire callbacks for changed domains
      changedDomains.forEach((domain) => {
        listenersRef.current.get(domain)?.forEach((cb) => {
          try {
            cb();
          } catch (e) {
            console.error(`[Polling] Callback error for domain "${domain}":`, e);
          }
        });
      });
    } catch {
      // Network errors are non-fatal — silently skip
    }
  }, [status]);

  const refresh = useCallback(() => {
    doPoll();
  }, [doPoll]);

  // ── Setup interval ────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== "authenticated") return;

    // Immediate first poll
    doPoll();

    const interval = setInterval(doPoll, POLL_INTERVAL_MS);

    // When the tab becomes visible again, refresh immediately so the user
    // sees current data without waiting up to 30 s for the next tick.
    const onVisible = () => {
      if (document.visibilityState === "visible") doPoll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status, doPoll, session?.user?.id]);

  return (
    <PollingContext.Provider value={{ timestamps, subscribe, refresh }}>
      {children}
    </PollingContext.Provider>
  );
}
