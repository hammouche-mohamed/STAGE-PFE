import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AuditService } from "@/lib/services/audit.service";
import { NotificationService } from "@/lib/services/notification.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { action } = await req.json();
    if (action !== "ACCEPT" && action !== "REJECT") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const topic = await prisma.topic.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        status: true,
        filiereId: true,
        assignedTeacherId: true,
        proposedById: true,
      },
    });
    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    // The teacher must either be the legacy single-assigned PENDING_TEACHER
    // invitee OR have a PENDING TeacherApplication created by the new multi-
    // invite flow. Either way they're considered "invited to supervise".
    const isLegacyAssignee =
      topic.assignedTeacherId === session.user.id &&
      topic.status === "PENDING_TEACHER";

    const myApp = await prisma.teacherApplication.findUnique({
      where: {
        teacherId_topicId: { teacherId: session.user.id, topicId: id },
      },
    });
    const hasPendingInvite = myApp?.status === "PENDING";

    if (!isLegacyAssignee && !hasPendingInvite) {
      return NextResponse.json(
        { error: "You don't have a pending invitation for this topic." },
        { status: 403 },
      );
    }

    // Another teacher already accepted while this teacher was deciding.
    if (topic.assignedTeacherId && topic.assignedTeacherId !== session.user.id) {
      return NextResponse.json(
        { error: "Another supervisor has already been confirmed for this topic." },
        { status: 409 },
      );
    }

    if (action === "ACCEPT") {
      // The first accepter wins. Lock the topic to this teacher and publish
      // it for student selection in the same step.
      await prisma.topic.update({
        where: { id },
        data: {
          status: "OPEN_FOR_SELECTION",
          assignedTeacherId: session.user.id,
        },
      });

      // Mark this teacher's application ACCEPTED (create it if it doesn't
      // exist — covers the legacy single-assign path where no application
      // row was ever created).
      if (myApp) {
        await prisma.teacherApplication.update({
          where: { id: myApp.id },
          data: { status: "ACCEPTED" },
        });
      }

      // Close out every other PENDING invitation and tell those teachers
      // why their invitation was withdrawn.
      const losers = await prisma.teacherApplication.findMany({
        where: {
          topicId: id,
          status: "PENDING",
          NOT: { teacherId: session.user.id },
        },
        select: { teacherId: true },
      });
      if (losers.length > 0) {
        await prisma.teacherApplication.updateMany({
          where: {
            topicId: id,
            status: "PENDING",
            NOT: { teacherId: session.user.id },
          },
          data: { status: "REJECTED" },
        });
        await Promise.all(
          losers.map((l) =>
            NotificationService.trigger({
              userId: l.teacherId,
              type: "TEACHER_REJECTED",
              title: "Supervision Invitation Closed",
              message: `Another supervisor was confirmed for "${topic.title}".`,
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
        message: `${session.user.name} accepted to supervise "${topic.title}". The topic is now open for student selection.`,
        relatedId: topic.id,
        relatedType: "Topic",
      });
    } else {
      // This teacher declines their invitation. Do NOT touch topic state —
      // other invitees may still accept. Only reject this teacher's row.
      if (myApp) {
        await prisma.teacherApplication.update({
          where: { id: myApp.id },
          data: { status: "REJECTED" },
        });
      }

      // Legacy single-assign path: also clear the topic's assignedTeacherId
      // and bounce it back to OPEN_FOR_SELECTION so it stays in the pool.
      if (isLegacyAssignee) {
        await prisma.topic.update({
          where: { id },
          data: {
            status: "OPEN_FOR_SELECTION",
            assignedTeacherId: null,
            rejectionReason: "Assigned teacher declined the supervision",
          },
        });
      }

      await NotificationService.trigger({
        userId: topic.proposedById,
        type: "TEACHER_REJECTED",
        title: "Supervisor Declined",
        message: `${session.user.name} declined to supervise "${topic.title}".`,
        relatedId: topic.id,
        relatedType: "Topic",
      });

      // Tell the admins so they can invite someone else (or know the queue
      // is thinning out).
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
            message: `${session.user.name} declined to supervise "${topic.title}". You may invite another supervisor.`,
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

    await NotificationService.clearRelated(id, "Topic");

    return NextResponse.json({
      message: action === "ACCEPT" ? "Supervision accepted." : "Supervision declined.",
    });
  } catch (error) {
    console.error("[teacher-action]", error);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
