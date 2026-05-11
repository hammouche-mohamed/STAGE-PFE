import prisma from "@/lib/prisma";
import LandingClient from "./_components/LandingClient";
import { cache } from "react";

const getSystemSettings = cache(async () => {
  const [logo, year, regOpen] = await Promise.all([
    prisma.systemSettings.findUnique({ where: { key: "universityLogo" } }),
    prisma.systemSettings.findUnique({ where: { key: "currentAcademicYear" } }),
    prisma.systemSettings.findUnique({ where: { key: "registrationOpen" } }),
  ]);
  return { logo, year, regOpen };
});

export const dynamic = "force-dynamic";

export default async function Home() {
  let logoUrl = "";
  let academicYear = "N/A";
  let registrationOpen = "false";

  try {
    const { logo: logoSetting, year: yearSetting, regOpen: regSetting } = await getSystemSettings();
    const baseLogoUrl = logoSetting?.value || "";
    const routedLogoUrl = baseLogoUrl.startsWith("/uploads/") ? `/api${baseLogoUrl}` : baseLogoUrl;
    logoUrl = routedLogoUrl ? `${routedLogoUrl}?v=${logoSetting?.updatedAt?.getTime() || Date.now()}` : "";
    academicYear = yearSetting?.value || "N/A";
    registrationOpen = regSetting?.value || "false";
  } catch {
    // DB unavailable — render with defaults
  }

  return <LandingClient logoUrl={logoUrl} academicYear={academicYear} registrationOpen={registrationOpen} />;
}
