import { NextResponse } from "next/server";
import { getCachedSettings, getCachedFilieres } from "@/lib/cache";

// Safe public settings that any (even unauthenticated) page can read
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

    // Merge Filieres into result
    result.filieres = filieres;

    return NextResponse.json({ data: result });
  } catch {
    return NextResponse.json({ data: { filieres: [] } });
  }
}
