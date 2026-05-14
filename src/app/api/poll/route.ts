import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * Lightweight polling endpoint — returns the MAX(updatedAt/createdAt)
 * timestamp for each data domain. Clients compare these timestamps to
 * know whether they need to re-fetch without having to fetch the full data.
 *
 * One request per polling cycle (default 30s) covers the entire site.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const role = session.user.role;

    // Always-needed domains for all roles
    const [notificationTs, userTs] = await Promise.all([
      prisma.notification.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.user.findFirst({
        where: { id: session.user.id },
        select: { updatedAt: true },
      }),
    ]);

    const timestamps: Record<string, string | null> = {
      notifications: notificationTs?.createdAt?.toISOString() ?? null,
      profile: userTs?.updatedAt?.toISOString() ?? null,
    };

    // Admin-specific domains
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
          where: { role: { not: "ADMIN" } },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
      ] as any);

      timestamps.registrations = regTs?.createdAt?.toISOString() ?? null;
      timestamps.topics = topicTs?.updatedAt?.toISOString() ?? null;
      timestamps.internships = internshipTs?.updatedAt?.toISOString() ?? null;
      timestamps.users = userListTs?.updatedAt?.toISOString() ?? null;
    }

    // Teacher-specific domains
    if (role === "TEACHER") {
      const [internshipTs, topicTs] = await Promise.all([
        prisma.internship.findFirst({
          where: { teacherId: session.user.id },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
        prisma.topic.findFirst({
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
      ] as any);
      timestamps.internships = internshipTs?.updatedAt?.toISOString() ?? null;
      timestamps.topics = topicTs?.updatedAt?.toISOString() ?? null;
    }

    // Student-specific domains
    if (role === "STUDENT") {
      const [internshipTs, topicTs, invitationTs] = await Promise.all([
        prisma.internship.findFirst({
          where: { internshipStudent: { some: { studentId: session.user.id } } } as any,
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
        prisma.topic.findFirst({
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
        (prisma as any).binomeinvitation.findFirst({
          where: { invitedStudentId: session.user.id },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
      ] as any);
      timestamps.internships = internshipTs?.updatedAt?.toISOString() ?? null;
      timestamps.topics = topicTs?.updatedAt?.toISOString() ?? null;
      timestamps.invitations = invitationTs?.createdAt?.toISOString() ?? null;
    }

    // Company-specific domains
    if (role === "COMPANY") {
      const [topicTs, applicationTs, internshipTs] = await Promise.all([
        prisma.topic.findFirst({
          where: { proposedById: session.user.id },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
        prisma.studentApplication.findFirst({
          where: { topic: { proposedById: session.user.id } },
          orderBy: { appliedAt: "desc" },
          select: { appliedAt: true },
        }),
        prisma.internship.findFirst({
          where: { topic: { proposedById: session.user.id } },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
      ] as any);
      timestamps.topics = topicTs?.updatedAt?.toISOString() ?? null;
      timestamps.applications = applicationTs?.appliedAt?.toISOString() ?? null;
      timestamps.internships = internshipTs?.updatedAt?.toISOString() ?? null;
    }

    const response = NextResponse.json({ timestamps });
    // Very short cache — we want near-real-time but protect against storms
    response.headers.set("Cache-Control", "private, max-age=5, stale-while-revalidate=10");
    return response;
  } catch (error) {
    console.error("Poll error:", error);
    return NextResponse.json({ timestamps: {} });
  }
}
