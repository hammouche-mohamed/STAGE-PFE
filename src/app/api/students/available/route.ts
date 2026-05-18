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

    const unavailableMembers = await prisma.teamMember.findMany({
      select: { studentId: true }
    });
    const unavailableIds = unavailableMembers.map(m => m.studentId);
    unavailableIds.push(session.user.id);
    // Same DEPARTMENT only. Level is intentionally NOT filtered here so a
    // team can mix levels (allowed for multi-level / NORMAL topics). The
    // per-topic level rules are enforced at application time.
    const availableStudents = await prisma.studentProfile.findMany({
      where: {
        filiereId: studentProfile.filiereId,
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
