import { format, formatDistanceToNow, isValid } from "date-fns";

/** Format a Date or ISO string to a readable display format, e.g. "Apr 16, 2026" */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (!isValid(d)) return "—";
  return format(d, "MMM d, yyyy");
}

/** Format with time: "Apr 16, 2026 14:30" */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (!isValid(d)) return "—";
  return format(d, "MMM d, yyyy HH:mm");
}

/** Relative time: "3 days ago", "in 2 hours" */
export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (!isValid(d)) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

/** Monospace date for tables: "2026-04-16" */
export function formatShortDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (!isValid(d)) return "—";
  return format(d, "yyyy-MM-dd");
}
