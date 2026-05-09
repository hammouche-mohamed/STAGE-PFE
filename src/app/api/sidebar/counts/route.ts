import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    const userId = session.user.id;
    const counts: Record<string, number> = {};

    if (role === "ADMIN") {
      counts["/admin/registrations"] = await prisma.registrationRequest.count({
        where: { status: "PENDING" },
      });
      counts["/admin/topics"] = await prisma.topic.count({
        where: { status: "PENDING_ADMIN" },
      });
      counts["/admin/internships"] = await prisma.internship.count({
        where: { status: "REQUESTED" },
      });
    } else if (role === "TEACHER") {
      counts["/teacher/internships"] = await prisma.internship.count({
        where: { teacherId: userId, status: "REQUESTED" },
      });
      counts["/teacher/documents"] = await prisma.document.count({
        where: { 
          internship: { teacherId: userId },
          status: "UPLOADED"
        },
      });
      counts["/teacher/messages"] = await prisma.message.count({
        where: {
          internship: { teacherId: userId },
          reads: { none: { userId } },
        },
      });
    } else if (role === "COMPANY") {
      counts["/company/applications"] = await prisma.studentApplication.count({
        where: { 
          topic: { proposedById: userId },
          status: "PENDING"
        },
      });
      counts["/company/messages"] = await prisma.message.count({
        where: {
          internship: { topic: { proposedById: userId } },
          reads: { none: { userId } },
        },
      });
    } else if (role === "STUDENT") {
      counts["/student/invitations"] = await prisma.binomeInvitation.count({
        where: { invitedStudentId: userId, status: "PENDING" },
      });
      counts["/student/messages"] = await prisma.message.count({
        where: {
          internship: { students: { some: { studentId: userId } } },
          reads: { none: { userId } },
        },
      });
    }

    return NextResponse.json(counts);
  } catch (error) {
    console.error("Sidebar counts error:", error);
    return NextResponse.json({}, { status: 500 });
  }
}
