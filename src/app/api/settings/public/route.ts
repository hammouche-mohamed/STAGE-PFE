import { NextResponse } from "next/server";
import { getCachedSettings, getCachedFilieres } from "@/lib/cache";

const PUBLIC_KEYS = ["proposalFormTemplateUrl", "currentAcademicYear", "availableSpecialities", "availablePromotions", "registrationOpen"];

export async function GET() {
  try {
    const [settings, filieres] = await Promise.all([
      getCachedSettings(),
      getCachedFilieres()
    ]);

    const result: Record<string, any> = {};
    for (const key of PUBLIC_KEYS) {
      if (settings[key]) result[key] = settings[key];
    }

    result.filieres = filieres;

    const response = NextResponse.json({ data: result });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.json({ data: { filieres: [] } });
  }
}
