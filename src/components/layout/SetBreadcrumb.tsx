"use client";

import { useEffect } from "react";
import { useBreadcrumbs } from "@/lib/contexts/BreadcrumbContext";

/**
 * Registers a human-readable breadcrumb label for a dynamic path segment
 * (e.g. an internship UUID) so the Topbar shows the title instead of the id.
 * Mounted from server pages that know the entity's name.
 */
export default function SetBreadcrumb({
  segment,
  label,
}: {
  segment: string;
  label: string;
}) {
  const { setLabel } = useBreadcrumbs();

  useEffect(() => {
    if (segment && label) setLabel(segment.toLowerCase(), label);
  }, [segment, label, setLabel]);

  return null;
}
