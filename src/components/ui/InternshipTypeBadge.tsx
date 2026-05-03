"use client";

import React from "react";
import type { InternshipType } from "@/types/internship";

interface InternshipTypeBadgeProps {
  type: InternshipType | string | null | undefined;
  size?: "sm" | "md";
}

/**
 * Purple badge for PFE, Emerald badge for NORMAL.
 * Shown on all topic cards, internship rows, and detail pages.
 */
export function InternshipTypeBadge({
  type,
  size = "sm",
}: InternshipTypeBadgeProps) {
  if (!type) return null;

  const isPFE = type === "PFE";

  const base =
    size === "sm"
      ? "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase"
      : "inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase";

  const colour = isPFE
    ? "bg-purple-100 text-purple-700 border border-purple-200"
    : "bg-emerald-100 text-emerald-700 border border-emerald-200";

  return (
    <span className={`${base} ${colour}`}>
      {isPFE ? "PFE" : "Normal"}
    </span>
  );
}
