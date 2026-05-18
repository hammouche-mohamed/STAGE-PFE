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
    const { action } = await req.json();

    const topic = await prisma.topic.findUnique({
      where: { id },
    });

    if (!topic || topic.assignedTeacherId !== session.user.id) {
      return NextResponse.json({ error: "Topic not assigned to you" }, { status: 403 });
    }

    // The accept/decline gate only applies while the topic is waiting on the
    // teacher. Once it has moved on (already opened, taken, …) the assignment
    // can no longer be confirmed or declined here.
    if (topic.status !== "PENDING_TEACHER") {
      return NextResponse.json(
        { error: "This assignment is no longer awaiting your confirmation." },
        { status: 400 },
      );
    }

    if (action === "ACCEPT") {
      // The teacher confirmed the assignment — they are now the supervisor and
      // the topic opens for student selection.
      await prisma.topic.update({
        where: { id },
        data: { status: "OPEN_FOR_SELECTION" },
      });

      await NotificationService.trigger({
        userId: topic.proposedById,
        type: "TEACHER_ACCEPTED",
        title: "Supervisor Accepted",
        message: `The assigned supervisor has accepted "${topic.title}". The topic is now open for student selection.`,
        relatedId: topic.id,
        relatedType: "Topic",
      });
    } else {
      // The teacher declined — release the assignment and hand the topic back
      // to the administration so a different supervisor can be picked.
      await prisma.topic.update({
        where: { id },
        data: {
          status: "PENDING_ADMIN",
          rejectionReason: "Assigned teacher declined the supervision",
          assignedTeacherId: null,
        },
      });

      // Drop the declining teacher's marketplace application so they are no
      // longer listed as a candidate for this topic.
      await prisma.teacherApplication
        .deleteMany({ where: { topicId: id, teacherId: session.user.id } })
        .catch(() => null);

      await NotificationService.trigger({
        userId: topic.proposedById,
        type: "TEACHER_REJECTED",
        title: "Supervisor Declined",
        message: `The assigned supervisor declined "${topic.title}". The administration will assign another supervisor.`,
        relatedId: topic.id,
        relatedType: "Topic",
      });

      // Notify the responsible administrators so they can reassign.
      const admins = await prisma.user.findMany({
        where: {
          role: "ADMIN",
          ...(topic.filiereId
            ? {
                OR: [
                  { adminprofile: { isSuperAdmin: true } },
                  { adminprofile: { filiereId: topic.filiereId } },
                ],
              }
            : {}),
        } as any,
        select: { id: true },
      });

      await Promise.all(
        admins.map((admin) =>
          NotificationService.trigger({
            userId: admin.id,
            type: "TEACHER_REJECTED",
            title: "Supervisor Declined — Reassignment Needed",
            message: `${session.user.name} declined to supervise "${topic.title}". Please assign another supervisor.`,
            relatedId: topic.id,
            relatedType: "Topic",
            link: "/admin/topics",
          }).catch(() => null),
        ),
      );
    }

    await AuditService.log({
      userId: session.user.id,
      action: action === "ACCEPT" ? "TEACHER_TOPIC_ACCEPTED" : "TEACHER_TOPIC_REJECTED",
      targetType: "Topic",
      targetId: topic.title,
    });

    await NotificationService.clearRelated(id, 'Topic');

    return NextResponse.json({ message: `Topic ${action.toLowerCase()}ed successfully` });
  } catch (error) {
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
