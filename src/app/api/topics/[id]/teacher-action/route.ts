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

      // The topic stayed in the marketplace while it was PENDING_TEACHER, so
      // other teachers may have applied in the meantime. Now that this teacher
      // is officially the supervisor, close out every other PENDING
      // application and notify those teachers their request was not selected.
      const losers = await prisma.teacherApplication.findMany({
        where: { topicId: id, status: "PENDING", NOT: { teacherId: session.user.id } },
        select: { teacherId: true },
      });
      if (losers.length > 0) {
        await prisma.teacherApplication.updateMany({
          where: { topicId: id, status: "PENDING", NOT: { teacherId: session.user.id } },
          data: { status: "REJECTED" },
        });
        await Promise.all(
          losers.map((l) =>
            NotificationService.trigger({
              userId: l.teacherId,
              type: "TEACHER_REJECTED",
              title: "Supervision Request Closed",
              message: `Another supervisor was confirmed for "${topic.title}". Your supervision request was not selected.`,
              relatedId: topic.id,
              relatedType: "Topic",
            }).catch(() => null),
          ),
        );
      }

      await NotificationService.trigger({
        userId: topic.proposedById,
        type: "TEACHER_ACCEPTED",
        title: "Supervisor Accepted",
        message: `The assigned supervisor has accepted "${topic.title}". The topic is now open for student selection.`,
        relatedId: topic.id,
        relatedType: "Topic",
      });
    } else {
      // The teacher declined — release the assignment but keep the topic
      // open: it goes back to OPEN_FOR_SELECTION so it shows up in the
      // teachers' marketplace (any other teacher can self-apply) and stays
      // available to students. The admin is still notified to reassign if
      // they want to pick a specific supervisor.
      await prisma.topic.update({
        where: { id },
        data: {
          status: "OPEN_FOR_SELECTION",
          rejectionReason: "Assigned teacher declined the supervision",
          assignedTeacherId: null,
        },
      });

      // Mark the declining teacher's own application as REJECTED so the
      // record remains for audit purposes. Other teachers' applications
      // (the queue of interest) stay untouched so the admin can pick from
      // them. Stale REJECTED rows are no longer a re-application blocker —
      // apply-supervision POST repurposes a REJECTED row back to PENDING
      // when the same teacher wants another chance.
      await prisma.teacherApplication
        .updateMany({
          where: { topicId: id, teacherId: session.user.id },
          data: { status: "REJECTED" },
        })
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
