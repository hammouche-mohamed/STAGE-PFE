import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Safe public settings that any (even unauthenticated) page can read
const PUBLIC_KEYS = ["proposalFormTemplateUrl", "currentAcademicYear", "availableSpecialities", "availablePromotions", "registrationOpen"];

// NFR-P2: cache public settings for 5 minutes
let cachedPublicSettings: { data: Record<string, string>; expiry: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET() {
  try {
    const [settings, filieres] = await Promise.all([
      prisma.systemSettings.findMany({
        where: { key: { in: PUBLIC_KEYS } },
        select: { key: true, value: true },
      }),
      prisma.filiere.findMany({
        where: { isActive: true },
        select: { id: true, name: true }
      })
    ]);
    
    const result: Record<string, any> = {};
    for (const s of settings) result[s.key] = s.value;

    // Merge Filieres into result
    result.filieres = filieres;


    return NextResponse.json({ data: result });
  } catch {
    return NextResponse.json({ data: { filieres: [] } });
  }
}
