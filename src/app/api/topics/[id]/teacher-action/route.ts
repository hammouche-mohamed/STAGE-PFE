import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AuditService } from "@/lib/services/audit.service";
import { NotificationService } from "@/lib/services/notification.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { action } = await req.json(); // "ACCEPT" or "REJECT"

    const topic = await prisma.topic.findUnique({
      where: { id },
    });

    if (!topic || topic.assignedTeacherId !== session.user.id) {
      return NextResponse.json({ error: "Topic not assigned to you" }, { status: 403 });
    }

    if (action === "ACCEPT") {
      await prisma.topic.update({
        where: { id },
        data: { status: "APPROVED" },
      });

      await NotificationService.trigger({
        userId: topic.proposedById,
        type: "TEACHER_ACCEPTED",
        title: "Supervisor Accepted",
        message: `The teacher has accepted to supervise your topic: "${topic.title}". The topic is now fully approved.`,
        relatedId: topic.id,
        relatedType: "Topic",
      });
    } else {
      await prisma.topic.update({
        where: { id },
        data: { 
          status: "REJECTED",
          rejectionReason: "Teacher rejected assignment",
          // Reset assigned teacher so admin can re-assign or student can pick another
          assignedTeacherId: null, 
        },
      });

      await NotificationService.trigger({
        userId: topic.proposedById,
        type: "TEACHER_REJECTED",
        title: "Supervisor Rejected",
        message: `The assigned teacher has declined to supervise your topic: "${topic.title}". Please consult with the administration.`,
        relatedId: topic.id,
        relatedType: "Topic",
      });
    }

    await AuditService.log({
      userId: session.user.id,
      action: action === "ACCEPT" ? "TEACHER_TOPIC_ACCEPTED" : "TEACHER_TOPIC_REJECTED",
      targetType: "Topic",
      targetId: topic.title,
    });

    // Clear supervision notifications for the teacher
    await NotificationService.clearRelated(id, 'Topic');

    return NextResponse.json({ message: `Topic ${action.toLowerCase()}ed successfully` });
  } catch (error) {
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
