import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Public profile — any authenticated user can view basic info
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        level: true,
        avatarUrl: true,
        createdAt: true,
        studentProfile: { select: { speciality: true, promotion: true, academicYear: true } },
        teacherProfile: { select: { speciality: true, grade: true, maxStudents: true } },
        companyProfile: { select: { companyName: true, sector: true, wilaya: true, contactPhone: true } },
      },
    });

    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ data: user });
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
