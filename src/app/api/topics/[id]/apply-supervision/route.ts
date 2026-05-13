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
      }),
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
        } : {})
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
