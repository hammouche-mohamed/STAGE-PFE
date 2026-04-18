import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Public keys anyone can read (non-sensitive settings)
const PUBLIC_KEYS = ["currentAcademicYear", "registrationOpen", "availableSpecialities", "availablePromotions"];

export async function GET(req: NextRequest) {

  try {
    const settings = await prisma.systemSettings.findMany({
      where: { key: { in: PUBLIC_KEYS } },
    });

    const settingMap = settings.reduce((acc: Record<string, string>, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    // Fallback defaults
    const result = {
      currentAcademicYear: settingMap.currentAcademicYear || "2024-2025",
      registrationOpen: settingMap.registrationOpen || "false",
      availableSpecialities: settingMap.availableSpecialities || "Computer Science,Artificial Intelligence,Software Engineering,Cybersecurity",
      availablePromotions: settingMap.availablePromotions || "M1 Génie Logiciel,M2 Génie Logiciel,M1 SI,M2 SI",
    };

    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
