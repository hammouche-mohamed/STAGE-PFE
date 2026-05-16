import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";
import { AuditService } from "@/lib/services/audit.service";
import { resolveTeamCap } from "@/lib/services/teamSize.service";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const topicId = searchParams.get("topicId");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  try {
    const where: any = {};
    if (session.user.role === "COMPANY") {
      where.topic = { proposedById: session.user.id };
      if (topicId) where.topicId = topicId;
    } else if (session.user.role === "STUDENT") {
      const member = await prisma.teamMember.findFirst({
        where: { studentId: session.user.id },
        select: { teamId: true },
      });
      if (member) {
        where.teamId = member.teamId;
        where.status = { not: "REJECTED" };
      } else {
        return NextResponse.json({ data: [], pagination: { page, limit, total: 0 } });
      }
    } else if (session.user.role === "ADMIN") {
      if (topicId) where.topicId = topicId;
    }

    const [applications, total] = await Promise.all([
      prisma.studentApplication.findMany({
        where,
        select: {
          id: true,
          topicId: true,
          status: true,
          appliedAt: true,
          reviewedAt: true,
          message: true,
          isBinome: true,
          leaderId: true,
          partnerId: true,
          topic: { select: { title: true, type: true, status: true } },
          studentteam: {
            select: {
              id: true,
              teammember: {
                select: { user: { select: { id: true, name: true, email: true } } },
              },
            },
          },
        },
        orderBy: { appliedAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.studentApplication.count({ where }),
    ]);

    const mappedApplications = applications.map((app: any) => ({
      ...app,
      team: app.studentteam
        ? {
          members: (app.studentteam.teammember ?? []).map((m: any) => ({
            student: m.user,
          })),
        }
        : null,
    }));

    const response = NextResponse.json({
      data: mappedApplications,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
    response.headers.set("Cache-Control", "private, max-age=10, stale-while-revalidate=30");
    return response;
  } catch (error) {
    console.error("[applications GET]", error);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { topicId, message } = await req.json();
    if (!topicId) return NextResponse.json({ error: "topicId is required" }, { status: 400 });

    const activeInternship = await prisma.internshipStudent.findFirst({
      where: {
        studentId: session.user.id,
        internship: { status: { notIn: ["CANCELLED"] } },
      },
      include: { internship: { include: { topic: { select: { title: true } } } } },
    });

    if (activeInternship) {
      return NextResponse.json(
        {
          error: "ALREADY_IN_INTERNSHIP",
          message: `You are already enrolled in "${activeInternship.internship.topic.title}". You can only be in one internship at a time.`,
        },
        { status: 409 },
      );
    }

    let member = await prisma.teamMember.findFirst({
      where: { studentId: session.user.id },
      include: { studentteam: true }
    });
    if (!member) {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id }
      });
      if (!studentProfile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

      const team = await prisma.studentTeam.create({
        data: {
          leaderId: session.user.id,
          filiereId: studentProfile.filiereId,
          academicYear: studentProfile.academicYear,
        }
      });

      member = await prisma.teamMember.create({
        data: { teamId: team.id, studentId: session.user.id, isLeader: true },
        include: { studentteam: true }
      });
    }

    const teamId = member.teamId;

    const existingApp = await prisma.studentApplication.findFirst({
      where: { topicId, teamId, status: { not: "REJECTED" } },
    });
    if (existingApp) {
      return NextResponse.json({ error: "Your team already applied to this topic." }, { status: 409 });
    }

    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic || topic.status !== "OPEN_FOR_SELECTION") {
      return NextResponse.json({ error: "This topic is no longer available." }, { status: 409 });
    }
    const cap = await resolveTeamCap(topic as any);
    if (cap !== null) {
      const teamSize = await prisma.teamMember.count({ where: { teamId } });
      if (teamSize > cap) {
        const kind =
          topic.type === "COMPANY_PROPOSED" ? "the company" : "the PFE policy";
        return NextResponse.json(
          {
            error: `This topic allows at most ${cap} student(s) per team (set by ${kind}). Your team has ${teamSize}. Remove members before applying.`,
          },
          { status: 409 },
        );
      }
    }

    const application = await prisma.studentApplication.create({
      data: {
        id: randomUUID(),
        topicId,
        teamId,
        leaderId: session.user.id,
        message,
        status: "PENDING",
      },
    } as any);
    if (topic.assignedTeacherId) {
      await prisma.notification.create({
        data: {
          id: randomUUID(),
          userId: topic.assignedTeacherId,
          type: 'TOPIC_SUBMITTED',
          title: 'New Student Application',
          message: `A new student team has applied for your topic: "${topic.title}".`,
          relatedId: topicId,
          relatedType: 'Topic',
          link: `/teacher/topics/${topicId}`,
        }
      });
    }

    // 2. Notify Relevant Admins (Dept Admin + Super Admins)
    const admins = await prisma.user.findMany({
      where: {
        role: "ADMIN",
        ...(topic.filiereId ? {
          OR: [
            { adminprofile: { isSuperAdmin: true } },
            { adminprofile: { filiereId: topic.filiereId } }
          ]
        } : {} as any)
      },
      select: { id: true }
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(admin => ({
          id: randomUUID(),
          userId: admin.id,
          type: 'TOPIC_SUBMITTED',
          title: 'New Student Team Application',
          message: `A new student team has applied for "${topic.title}".`,
          relatedId: topicId,
          relatedType: 'Topic',
          link: `/admin/topics/${topicId}`,
        }))
      });
    }

    await AuditService.log({
      userId: session.user.id,
      action: "APPLICATION_SUBMITTED",
      targetType: "StudentApplication",
      targetId: application.id,
      details: { topicId, topicTitle: topic.title, teamId },
    });

    return NextResponse.json({ data: application }, { status: 201 });
  } catch (error) {
    console.error("[applications POST]", error);
    return NextResponse.json({ error: "Failed to apply" }, { status: 500 });
  }
}

