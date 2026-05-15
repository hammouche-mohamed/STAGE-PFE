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

    const response = NextResponse.json({ data: result });
    // Must NOT be edge-cached: this gates `registrationOpen`, which the
    // super admin can flip at any time and must take effect immediately.
    // Freshness comes from `getCachedSettings` (tag 'settings', busted on
    // every settings change); a stale CDN copy would let the register page
    // disagree with the live POST /api/registrations enforcement.
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.json({ data: { filieres: [] } });
  }
}
