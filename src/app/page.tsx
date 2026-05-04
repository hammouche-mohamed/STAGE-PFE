import prisma from "@/lib/prisma";
import { LandingClient } from "./_components/LandingClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  let logoUrl = "";
  let academicYear = "2024-2025";

  try {
    const [logoSetting, yearSetting] = await Promise.all([
      prisma.systemSettings.findUnique({ where: { key: "universityLogo" } }),
      prisma.systemSettings.findUnique({ where: { key: "currentAcademicYear" } }),
    ]);
    const baseLogoUrl = logoSetting?.value || "";
    const routedLogoUrl = baseLogoUrl.startsWith("/uploads/") ? `/api${baseLogoUrl}` : baseLogoUrl;
    logoUrl = routedLogoUrl ? `${routedLogoUrl}?v=${Date.now()}` : "";
    academicYear = yearSetting?.value || "2024-2025";
  } catch {
    // DB unavailable — render with defaults
  }

  return <LandingClient logoUrl={logoUrl} academicYear={academicYear} />;
}
