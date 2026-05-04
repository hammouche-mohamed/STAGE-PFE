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

    if (!topic) return NextResponse.json({ error: "Topic not found." }, { status: 404 });

    return NextResponse.json({ data: topic });
  } catch (error) {
    console.error('[topics/[id] GET]', error);
    return NextResponse.json({ error: "Failed to load topic." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    // NFR-S2: return 403 Forbidden for authenticated non-admin, 401 only for unauthenticated
    return NextResponse.json({ error: "Forbidden" }, { status: session ? 403 : 401 });
  }

  try {
    const { id } = await params;
    const { teacherId, status, rejectionReason, title, description, type, maxStudents } = await req.json();

    const topic = await prisma.topic.findUnique({
      where: { id },
      include: { proposedBy: true }
    });

    if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

    // FR-T3: Check teacher load if being assigned
    if (teacherId && teacherId !== topic.assignedTeacherId) {
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: teacherId }
      });

      if (teacherProfile && teacherProfile.currentLoad >= teacherProfile.maxStudents) {
        return NextResponse.json({ 
          error: `Teacher has reached maximum supervision load (${teacherProfile.maxStudents}).` 
        }, { status: 400 });
      }
    }

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

    // Only notify proposer when the status actually changes to something meaningful
    if (status && ["OPEN_FOR_SELECTION", "REJECTED", "PENDING_TEACHER"].includes(status)) {
      const notifType = status === "OPEN_FOR_SELECTION"
        ? "TOPIC_APPROVED"
        : status === "REJECTED"
        ? "TOPIC_REJECTED"
        : "TOPIC_APPROVED";

      const notifTitle = status === "OPEN_FOR_SELECTION"
        ? "Topic Approved — Now Open for Selection"
        : status === "REJECTED"
        ? "Topic Rejected"
        : "Topic Updated";

      const notifMessage = status === "OPEN_FOR_SELECTION"
        ? `Your topic "${topic.title}" has been approved and is now open for student selection.`
        : status === "REJECTED"
        ? `Your topic "${topic.title}" was rejected. ${rejectionReason ? `Reason: ${rejectionReason}` : "Please contact administration for details."}`
        : `Your topic "${topic.title}" has been updated by administration.`;

      await NotificationService.trigger({
        userId: topic.proposedById,
        type: notifType,
        title: notifTitle,
        message: notifMessage,
        relatedId: topic.id,
        relatedType: "Topic",
      });
    }

    // Notify teacher if assigned to supervise
    if (teacherId && teacherId !== topic.assignedTeacherId) {
      await NotificationService.trigger({
        userId: teacherId,
        type: "TEACHER_ASSIGNED",
        title: "New Supervision Request",
        message: `You have been assigned to supervise the topic: "${topic.title}". Please review and accept or decline.`,
        relatedId: topic.id,
        relatedType: "Topic",
      });
    }

    await AuditService.log({
      userId: session.user.id,
      action: "TOPIC_UPDATED_BY_ADMIN",
      targetType: "Topic",
      targetId: updated.id,
      details: { status, teacherId },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[topics/[id] PATCH]', error);
    return NextResponse.json({ error: "Failed to update topic. Please try again." }, { status: 500 });
  }
}

export async function DELETE(
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
    });

    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    // Only Admin or the Proposer can delete the topic
    if (session.user.role !== "ADMIN" && topic.proposedById !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized to delete this topic" }, { status: 403 });
    }

    // Check if the topic is already assigned or in progress (can't delete if so)
    if (["APPROVED", "TAKEN", "IN_PROGRESS"].includes(topic.status)) {
      return NextResponse.json({ 
        error: "Cannot delete an approved or assigned topic. Please contact administration for cancellation." 
      }, { status: 400 });
    }

    await prisma.topic.delete({
      where: { id }
    });

    await AuditService.log({
      userId: session.user.id,
      action: "TOPIC_DELETED",
      targetType: "Topic",
      targetId: topic.title,
      details: { title: topic.title }
    });

    return NextResponse.json({ message: "Topic deleted successfully." });
  } catch (error) {
    console.error("Topic delete error:", error);
    return NextResponse.json({ error: "Failed to delete topic. Please try again." }, { status: 500 });
  }
}
