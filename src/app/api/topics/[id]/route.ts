import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AuditService } from "@/lib/services/audit.service";
import { NotificationService } from "@/lib/services/notification.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const topic = await prisma.topic.findUnique({
      where: { id },
      include: { 
        proposedBy: { select: { id: true, name: true, email: true } },
        assignedTeacher: { select: { id: true, name: true } }
      }
    });

    if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

    return NextResponse.json({ data: topic });
  } catch (error) {
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { teacherId, status, rejectionReason, title, description, type, maxStudents } = await req.json();

    const topic = await prisma.topic.findUnique({
      where: { id },
      include: { proposedBy: true }
    });

    if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

    // logic for teacher assignment or topic rejection
    const updated = await prisma.topic.update({
      where: { id },
      data: {
        ...(teacherId && { assignedTeacherId: teacherId }),
        ...(status && { status }),
        ...(title && { title }),
        ...(description && { description }),
        ...(type && { type }),
        ...(maxStudents && { maxStudents: parseInt(maxStudents.toString()) }),
        ...(rejectionReason && { 
          rejectionReason,
          // Track rejection count if applicable
          ...(status === "REJECTED" && { supervisorRejectionCount: { increment: 1 } })
        }),
      }
    });

    // Notify proposer
    await NotificationService.trigger({
      userId: topic.proposedById,
      type: status === "APPROVED" ? "TOPIC_APPROVED" : "TOPIC_REJECTED",
      title: `Topic ${status.toLowerCase()}`,
      message: `Your topic "${topic.title}" has been ${status.toLowerCase()} by the administration. ${rejectionReason ? `Reason: ${rejectionReason}` : ""}`,
      relatedId: topic.id,
      relatedType: "Topic",
    });

    // Notify teacher if assigned
    if (teacherId && status === "PENDING_TEACHER") {
      await NotificationService.trigger({
        userId: teacherId,
        type: "TEACHER_ASSIGNED",
        title: "New Supervision Request",
        message: `You have been assigned to supervise the topic: "${topic.title}". Please accept or reject this assignment.`,
        relatedId: topic.id,
        relatedType: "Topic",
      });
    }

    await AuditService.log({
      userId: session.user.id,
      action: "TOPIC_UPDATED_BY_ADMIN",
      targetType: "Topic",
      targetId: id,
      details: { status, teacherId }
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
