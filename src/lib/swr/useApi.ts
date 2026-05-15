"use client";

import { useEffect, useRef } from "react";
import useSWR, { SWRConfiguration } from "swr";
import { usePolling } from "@/lib/contexts/PollingContext";

type Domain =
  | "notifications"
  | "profile"
  | "users"
  | "topics"
  | "internships"
  | "registrations"
  | "applications"
  | "invitations";

async function defaultFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`Request failed: ${res.status}`) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

export interface UseApiOptions<T> extends SWRConfiguration<T> {
  /**
   * Polling domains that should trigger a background revalidation of this
   * resource. Wires straight into the existing `PollingProvider`, so the
   * data refreshes within 30 s of a server-side change without the user
   * doing anything — and without a manual `usePollingRefresh` per page.
   */
  domains?: Domain | Domain[];
  /** Pass `null`/`false` to skip the request (conditional fetching). */
  enabled?: boolean;
}

/**
 * Cached data fetching for client pages.
 *
 * Drop-in replacement for the old `useState` + `useEffect(fetch)` pattern:
 *
 *   const { data, isLoading, error, refresh } = useApi<{ data: User[] }>(
 *     `/api/users?${params}`, { domains: "users" },
 *   );
 *
 * First visit fetches once; every later visit shows the cached result
 * instantly and revalidates in the background. `keepPreviousData` (set
 * globally) means changing filters won't blank the screen.
 */
export function useApi<T = unknown>(
  key: string | null,
  options: UseApiOptions<T> = {},
) {
  const { domains, enabled = true, ...swrOptions } = options;
  const activeKey = enabled ? key : null;

  const swr = useSWR<T>(activeKey, defaultFetcher, swrOptions);

  // Keep the latest mutate so the polling callback (registered once) always
  // revalidates the current key.
  const mutateRef = useRef(swr.mutate);
  mutateRef.current = swr.mutate;

  const { subscribe } = usePolling();
  const domainList = domains
    ? Array.isArray(domains)
      ? domains
      : [domains]
    : [];
  const domainKey = domainList.join(",");

  useEffect(() => {
    if (!domainKey) return;
    const unsubscribe = subscribe(domainKey.split(",") as Domain[], () => {
      mutateRef.current();
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainKey]);

  return {
    data: swr.data,
    error: swr.error as (Error & { status?: number }) | undefined,
    /** True only on the very first load with no cached data to show. */
    isLoading: swr.isLoading,
    /** True whenever a (possibly background) request is in flight. */
    isValidating: swr.isValidating,
    /** Force an immediate revalidation (e.g. after a local mutation). */
    refresh: swr.mutate,
    mutate: swr.mutate,
  };
}
