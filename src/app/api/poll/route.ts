import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";


export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const role = session.user.role;
    const userId = session.user.id;


    const notificationTs = await prisma.notification.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    const timestamps: Record<string, string | null> = {
      notifications: notificationTs?.createdAt?.toISOString() ?? null,
    };

    if (role === "ADMIN") {
      const [regTs, topicTs, internshipTs, userListTs] = await Promise.all([
        prisma.registrationRequest.findFirst({
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
        prisma.topic.findFirst({
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
        prisma.internship.findFirst({
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
        prisma.user.findFirst({
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
      ]);

      timestamps.registrations = regTs?.createdAt?.toISOString() ?? null;
      timestamps.topics = topicTs?.updatedAt?.toISOString() ?? null;
      timestamps.internships = internshipTs?.updatedAt?.toISOString() ?? null;
      timestamps.users = userListTs?.createdAt?.toISOString() ?? null;
    } else if (role === "TEACHER") {
      const [internshipTs, topicTs] = await Promise.all([
        prisma.internship.findFirst({
          where: { teacherId: userId },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
        prisma.topic.findFirst({
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
      ]);
      timestamps.internships = internshipTs?.updatedAt?.toISOString() ?? null;
      timestamps.topics = topicTs?.updatedAt?.toISOString() ?? null;
    } else if (role === "STUDENT") {
      const [internshipTs, topicTs, invitationTs] = await Promise.all([
        prisma.internship.findFirst({
          where: { internshipstudent: { some: { studentId: userId } } },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
        prisma.topic.findFirst({
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
        prisma.binomeinvitation.findFirst({
          where: { invitedStudentId: userId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
      ]);
      timestamps.internships = internshipTs?.updatedAt?.toISOString() ?? null;
      timestamps.topics = topicTs?.updatedAt?.toISOString() ?? null;
      timestamps.invitations = invitationTs?.createdAt?.toISOString() ?? null;
    } else if (role === "COMPANY") {
      const [topicTs, applicationTs, internshipTs] = await Promise.all([
        prisma.topic.findFirst({
          where: { proposedById: userId },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
        prisma.studentApplication.findFirst({
          where: { topic: { proposedById: userId } },
          orderBy: { appliedAt: "desc" },
          select: { appliedAt: true },
        }),
        prisma.internship.findFirst({
          where: { topic: { proposedById: userId } },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
      ]);
      timestamps.topics = topicTs?.updatedAt?.toISOString() ?? null;
      timestamps.applications = applicationTs?.appliedAt?.toISOString() ?? null;
      timestamps.internships = internshipTs?.updatedAt?.toISOString() ?? null;
    }

    const response = NextResponse.json({ timestamps });
    response.headers.set(
      "Cache-Control",
      "private, max-age=15, stale-while-revalidate=30",
    );
    return response;
  } catch (error) {
    console.error("Poll error:", error);
    return NextResponse.json({ timestamps: {} });
  }
}
