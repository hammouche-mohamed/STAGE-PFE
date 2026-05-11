import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!studentProfile) {
      return NextResponse.json({ data: [] });
    }

    // Find students who are already in a team
    const unavailableMembers = await prisma.teamMember.findMany({
      select: { studentId: true }
    });
    const unavailableIds = unavailableMembers.map(m => m.studentId);
    unavailableIds.push(session.user.id); // exclude self

    // Find students in the same filiere and academic year who are NOT in a team
    const availableStudents = await prisma.studentProfile.findMany({
      where: {
        filiereId: studentProfile.filiereId,
        academicYear: studentProfile.academicYear,
        level: studentProfile.level,
        userId: { notIn: unavailableIds }
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return NextResponse.json({ data: availableStudents });
  } catch (error) {
    console.error("[available students GET]", error);
    return NextResponse.json({ error: "Failed to load students" }, { status: 500 });
  }
}
