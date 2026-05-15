import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AuditService } from "@/lib/services/audit.service";
import { NotificationService } from "@/lib/services/notification.service";
import { randomUUID } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    
    // Fetch the topic and teacher profile to verify departments
    const [topic, teacherProfile] = await Promise.all([
      prisma.topic.findUnique({
        where: { id },
        include: { proposedBy: true }
      } as any),
      prisma.teacherProfile.findUnique({
        where: { userId: session.user.id }
      })
    ]);

    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    if (topic.assignedTeacherId) {
      return NextResponse.json({ error: "Topic already has a supervisor" }, { status: 400 });
    }

    if (topic.status !== "APPROVED" && topic.status !== "OPEN_FOR_SELECTION") {
      return NextResponse.json({ error: "Topic is not available for supervision" }, { status: 400 });
    }

    // Verify department (Filière) alignment
    if (topic.filiereId && teacherProfile?.filiereId && topic.filiereId !== teacherProfile.filiereId) {
      return NextResponse.json({ error: "You can only supervise topics in your department" }, { status: 403 });
    }

    // Capacity guard: a teacher already at their max supervision load cannot
    // request more topics. Count live (non-finished) supervised internships
    // rather than the stored counter, which can be stale.
    if (teacherProfile) {
      const activeSupervisions = await prisma.internship.count({
        where: {
          teacherId: session.user.id,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
      });
      if (activeSupervisions >= teacherProfile.maxStudents) {
        return NextResponse.json(
          {
            error: `You have reached your maximum supervision capacity (${teacherProfile.maxStudents}). Finish or release a current internship before requesting new topics.`,
          },
          { status: 409 },
        );
      }
    }

    // Check if teacher already applied
    const existingApp = await prisma.teacherApplication.findUnique({
      where: {
        teacherId_topicId: {
          teacherId: session.user.id,
          topicId: id
        }
      }
    });

    if (existingApp) {
      return NextResponse.json({ error: "You have already applied to supervise this topic" }, { status: 400 });
    }

    // Create the application
    const application = await prisma.teacherApplication.create({
      data: {
        id: randomUUID(),
        teacherId: session.user.id,
        topicId: id,
        status: "PENDING",
      }
    });

    // Notify Admins
    const admins = await prisma.user.findMany({
      where: { 
        role: "ADMIN",
        // If it's a Dept Admin, only notify them if it's their department
        ...(topic.filiereId ? {
          OR: [
            { adminprofile: { isSuperAdmin: true } },
            { adminprofile: { filiereId: topic.filiereId } }
          ]
        } : {} as any)
      }
    });

    for (const admin of admins) {
      await NotificationService.trigger({
        userId: admin.id,
        type: "TEACHER_ASSIGNED", // Reusing existing type for application
        title: "New Supervision Request",
        message: `Teacher ${session.user.name} has applied to supervise the topic: "${topic.title}".`,
        relatedId: topic.id,
        relatedType: "Topic",
        link: "/admin/topics"
      });
    }

    await AuditService.log({
      userId: session.user.id,
      action: "TEACHER_SUPERVISION_APPLIED",
      targetType: "Topic",
      targetId: topic.title,
    });

    return NextResponse.json({ 
      message: "Application submitted successfully",
      data: application 
    });
  } catch (error: any) {
    console.error("Supervision application failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/topics/[id]/apply-supervision
// A teacher withdraws their own PENDING supervision request, as long as the
// admin has not yet acted on it (status still PENDING, topic not assigned).
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const application = await prisma.teacherApplication.findUnique({
      where: { teacherId_topicId: { teacherId: session.user.id, topicId: id } },
      include: { topic: { select: { title: true, assignedTeacherId: true } } },
    });

    if (!application) {
      return NextResponse.json({ error: "No supervision request found." }, { status: 404 });
    }

    if (application.status !== "PENDING" || application.topic.assignedTeacherId) {
      return NextResponse.json(
        { error: "This request can no longer be cancelled — the administration has already acted on it." },
        { status: 400 },
      );
    }

    await prisma.teacherApplication.delete({ where: { id: application.id } });

    await AuditService.log({
      userId: session.user.id,
      action: "TEACHER_SUPERVISION_WITHDRAWN",
      targetType: "Topic",
      targetId: application.topic.title,
    });

    return NextResponse.json({ message: "Supervision request cancelled." });
  } catch (error: any) {
    console.error("Cancel supervision request failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
