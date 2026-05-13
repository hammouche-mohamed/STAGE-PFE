import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const topicId = searchParams.get("topicId");

  try {
    const where: any = {};
    if (session.user.role === "COMPANY") {
      where.topic = { proposedById: session.user.id };
      if (topicId) where.topicId = topicId;
    } else if (session.user.role === "STUDENT") {
      const member = await prisma.teamMember.findFirst({
        where: { studentId: session.user.id },
      });
      if (member) {
        where.teamId = member.teamId;
        where.status = { not: "REJECTED" };
      } else {
        // If they have no team, they have no applications
        return NextResponse.json({ data: [] });
      }
    } else if (session.user.role === "ADMIN") {
      if (topicId) where.topicId = topicId;
    }

    const applications = await prisma.studentApplication.findMany({
      where,
      include: { 
        topic: { select: { title: true, type: true, status: true } },
        team: {
          include: {
            members: { include: { student: { select: { name: true, email: true } } } }
          }
        }
      },
      orderBy: { appliedAt: "desc" },
    });

    return NextResponse.json({ data: applications });
  } catch (error) {
    console.error(error);
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

    // ── GUARD: already in an active internship ──────────────────────────────
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

    // ── Get User's Team ───────────────────────────────────────────────────────
    let member = await prisma.teamMember.findFirst({
      where: { studentId: session.user.id },
      include: { team: true }
    });

    // If student has no team, auto-create a team of 1
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
        include: { team: true }
      });
    }

    const teamId = member.teamId;

    // ── GUARD: already applied to this topic ────────────────────────────────
    const existingApp = await prisma.studentApplication.findFirst({
      where: { topicId, teamId, status: { not: "REJECTED" } },
    });
    if (existingApp) {
      return NextResponse.json({ error: "Your team already applied to this topic." }, { status: 409 });
    }

    // ── GUARD: topic must be open ────────────────────────────────────────────
    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic || topic.status !== "OPEN_FOR_SELECTION") {
      return NextResponse.json({ error: "This topic is no longer available." }, { status: 409 });
    }

    const application = await prisma.studentApplication.create({
      data: {
        id: randomUUID(),
        topicId,
        teamId,
        message,
        status: "PENDING",
      },
    });

    // ── NOTIFICATIONS ────────────────────────────────────────────────────────
    // 1. Notify Assigned Teacher (if any)
    if (topic.assignedTeacherId) {
      await prisma.notification.create({
        data: {
          id: randomUUID(),
          userId: topic.assignedTeacherId,
          type: 'TOPIC_SUBMITTED', // Or a more specific type
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
        } : {})
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

    return NextResponse.json({ data: application }, { status: 201 });
  } catch (error) {
    console.error("[applications POST]", error);
    return NextResponse.json({ error: "Failed to apply" }, { status: 500 });
  }
}

