import prisma from "../prisma";
import { randomUUID } from "crypto";
import { NotificationService } from "./notification.service";
import { AuditService } from "./audit.service";

export interface SchedulePayload {
  internshipId: string;
  title: string;
  scheduledAt: Date;
  room: string;
  timeSlot: string;
  documentDeadline: Date;
}

/**
 * FR-A5: Schedule, update and cancel mini-presentation sessions.
 *
 * Each session is anchored to an existing internship. Notifications are
 * fanned out to the supervising teacher and to every student attached to
 * the internship so they all see the date/room/document deadline.
 */
export class MiniPresentationService {
  static async list(filiereId?: string | null) {
    return prisma.miniPresentation.findMany({
      where: filiereId
        ? { internship: { topic: { filiereId } } }
        : undefined,
      include: {
        internship: {
          select: {
            id: true,
            teacherId: true,
            topic: { select: { title: true } },
            internshipstudent: {
              select: { user: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });
  }

  static async schedule(data: SchedulePayload, scheduledById: string) {
    const internship = await prisma.internship.findUnique({
      where: { id: data.internshipId },
      include: {
        topic: { select: { title: true } },
        internshipstudent: { select: { studentId: true } },
      },
    });
    if (!internship) throw new Error("Internship not found");

    if (data.scheduledAt.getTime() < Date.now()) {
      throw new Error("Scheduled date must be in the future");
    }
    if (data.documentDeadline.getTime() > data.scheduledAt.getTime()) {
      throw new Error("Document deadline must be on or before the scheduled date");
    }

    const created = await prisma.miniPresentation.create({
      data: {
        id: randomUUID(),
        internshipId: data.internshipId,
        title: data.title.trim(),
        scheduledAt: data.scheduledAt,
        room: data.room.trim(),
        timeSlot: data.timeSlot.trim(),
        documentDeadline: data.documentDeadline,
      },
    });

    await AuditService.log({
      userId: scheduledById,
      action: "MINI_PRESENTATION_SCHEDULED",
      targetType: "MiniPresentation",
      targetId: created.id,
      details: {
        internshipId: data.internshipId,
        title: data.title,
        scheduledAt: data.scheduledAt.toISOString(),
        room: data.room,
      },
    }).catch((err) => console.error("[mini-presentation] audit failed:", err));

    // Notify the teacher + all students attached to the internship.
    const recipientIds = [
      internship.teacherId,
      ...internship.internshipstudent.map((s) => s.studentId),
    ];
    const niceDate = data.scheduledAt.toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
    });
    for (const userId of recipientIds) {
      await NotificationService.trigger({
        userId,
        type: "MINI_PRESENTATION_SCHEDULED",
        title: "Mini-presentation scheduled",
        message:
          `A mini-presentation has been scheduled for "${internship.topic.title}".\n` +
          `When: ${niceDate}\nRoom: ${data.room}\nTime slot: ${data.timeSlot}\n` +
          `Document deadline: ${data.documentDeadline.toLocaleDateString("en-GB")}`,
        relatedId: created.id,
        relatedType: "MiniPresentation",
        link: "/admin/milestones",
      });
    }

    return created;
  }

  static async update(
    id: string,
    patch: Partial<SchedulePayload> & { status?: string; adminComment?: string | null },
    actorId: string,
  ) {
    const existing = await prisma.miniPresentation.findUnique({
      where: { id },
      include: {
        internship: {
          select: {
            teacherId: true,
            topic: { select: { title: true } },
            internshipstudent: { select: { studentId: true } },
          },
        },
      },
    });
    if (!existing) throw new Error("Mini-presentation not found");

    if (patch.scheduledAt && patch.documentDeadline && patch.documentDeadline > patch.scheduledAt) {
      throw new Error("Document deadline must be on or before the scheduled date");
    }

    const updated = await prisma.miniPresentation.update({
      where: { id },
      data: {
        title: patch.title?.trim(),
        scheduledAt: patch.scheduledAt,
        room: patch.room?.trim(),
        timeSlot: patch.timeSlot?.trim(),
        documentDeadline: patch.documentDeadline,
        status: patch.status as never,
        adminComment: patch.adminComment ?? undefined,
      },
    });

    await AuditService.log({
      userId: actorId,
      action: "MINI_PRESENTATION_UPDATED",
      targetType: "MiniPresentation",
      targetId: id,
      details: patch as Record<string, unknown>,
    }).catch((err) => console.error("[mini-presentation] audit failed:", err));

    // Notify on reschedule / cancellation.
    if (patch.scheduledAt || patch.status === "POSTPONED" || patch.status === "CANCELLED") {
      const recipientIds = [
        existing.internship.teacherId,
        ...existing.internship.internshipstudent.map((s) => s.studentId),
      ];
      const verb = patch.status === "CANCELLED" ? "cancelled" : "rescheduled";
      for (const userId of recipientIds) {
        await NotificationService.trigger({
          userId,
          type: "MINI_PRESENTATION_REMINDER",
          title: `Mini-presentation ${verb}`,
          message: `The mini-presentation for "${existing.internship.topic.title}" was ${verb} by the administration. Please check the new details on your dashboard.`,
          relatedId: id,
          relatedType: "MiniPresentation",
          link: "/admin/milestones",
        });
      }
    }

    return updated;
  }

  static async cancel(id: string, actorId: string) {
    return MiniPresentationService.update(id, { status: "CANCELLED" }, actorId);
  }

  static async remove(id: string, actorId: string) {
    const existing = await prisma.miniPresentation.findUnique({ where: { id } });
    if (!existing) throw new Error("Mini-presentation not found");

    await prisma.miniPresentation.delete({ where: { id } });

    await AuditService.log({
      userId: actorId,
      action: "MINI_PRESENTATION_DELETED",
      targetType: "MiniPresentation",
      targetId: id,
    }).catch((err) => console.error("[mini-presentation] audit failed:", err));
  }
}
