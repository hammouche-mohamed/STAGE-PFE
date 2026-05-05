import prisma from "@/lib/prisma";
import { LandingClient } from "./_components/LandingClient";
import { cache } from "react";

const getSystemSettings = cache(async () => {
  const [logo, year] = await Promise.all([
    prisma.systemSettings.findUnique({ where: { key: "universityLogo" } }),
    prisma.systemSettings.findUnique({ where: { key: "currentAcademicYear" } }),
  ]);
  return { logo, year };
});

export const dynamic = "force-dynamic";

export default async function Home() {
  let logoUrl = "";
  let academicYear = "2024-2025";

  try {
    const { logo: logoSetting, year: yearSetting } = await getSystemSettings();
    const baseLogoUrl = logoSetting?.value || "";
    const routedLogoUrl = baseLogoUrl.startsWith("/uploads/") ? `/api${baseLogoUrl}` : baseLogoUrl;
    logoUrl = routedLogoUrl ? `${routedLogoUrl}?v=${logoSetting?.updatedAt?.getTime() || Date.now()}` : "";
    academicYear = yearSetting?.value || "2024-2025";
  } catch {
    // DB unavailable — render with defaults
  }

  return <LandingClient logoUrl={logoUrl} academicYear={academicYear} />;
}
