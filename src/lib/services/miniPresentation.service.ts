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

export interface BulkSchedulePayload {
  title: string;
  scheduledAt: Date;
  room: string;
  timeSlot: string;
  documentDeadline: Date;
  /** Restrict to PFE internships in this filière. Null/undefined = every PFE
   *  internship across the institution (only meaningful for super admins). */
  filiereId?: string | null;
}

/**
 * Per-internship presentation slot: each PFE team gets its own scheduledAt,
 * room and time-slot label. The submission deadline is shared across the
 * cohort and lives on the parent payload.
 */
export interface MilestoneSlot {
  internshipId: string;
  scheduledAt: Date;
  room: string;
  timeSlot: string;
}

export interface BulkScheduleSlotsPayload {
  title: string;
  /** Shared across every milestone row created by this call. */
  documentDeadline: Date;
  slots: MilestoneSlot[];
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

    // Milestones are a PFE-only ceremony. NORMAL internships don't run
    // intermediate presentations, so blocking creation here keeps the admin
    // from accidentally scheduling one for the wrong cohort.
    if (internship.internshipType !== "PFE") {
      throw new Error("Milestones can only be scheduled for PFE internships.");
    }

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

  /**
   * Bulk-schedule a milestone for every active PFE internship in scope.
   * A milestone is conceptually a *cohort-wide* event — the whole filière's
   * PFE students run their mid-term presentation the same week — so creating
   * one milestone fans out into N rows (one per PFE internship). Each row is
   * independent thereafter (status / documentUrl / etc. are per-team).
   *
   * Skips internships that already have a milestone with the same `title` so
   * re-running by accident doesn't create duplicates.
   */
  static async scheduleBulkForFiliere(
    data: BulkSchedulePayload,
    scheduledById: string,
  ): Promise<{ created: number; skipped: number; total: number }> {
    if (data.scheduledAt.getTime() < Date.now()) {
      throw new Error("Scheduled date must be in the future");
    }
    if (data.documentDeadline.getTime() > data.scheduledAt.getTime()) {
      throw new Error("Document deadline must be on or before the scheduled date");
    }

    const internships = await prisma.internship.findMany({
      where: {
        internshipType: "PFE",
        status: { notIn: ["CANCELLED", "COMPLETED"] },
        ...(data.filiereId ? { topic: { filiereId: data.filiereId } } : {}),
      },
      select: {
        id: true,
        teacherId: true,
        topic: { select: { title: true } },
        internshipstudent: { select: { studentId: true } },
        minipresentation: {
          where: { title: data.title.trim() },
          select: { id: true },
        },
      } as any,
    });

    if (internships.length === 0) {
      throw new Error(
        data.filiereId
          ? "No active PFE internships found in this filière."
          : "No active PFE internships found.",
      );
    }

    const niceDate = data.scheduledAt.toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
    });
    let created = 0;
    let skipped = 0;

    for (const i of internships as any[]) {
      if ((i.minipresentation ?? []).length > 0) {
        skipped++;
        continue;
      }

      const row = await prisma.miniPresentation.create({
        data: {
          id: randomUUID(),
          internshipId: i.id,
          title: data.title.trim(),
          scheduledAt: data.scheduledAt,
          room: data.room.trim(),
          timeSlot: data.timeSlot.trim(),
          documentDeadline: data.documentDeadline,
        },
      });
      created++;

      const recipientIds = [
        i.teacherId,
        ...i.internshipstudent.map((s: { studentId: string }) => s.studentId),
      ];
      await Promise.all(
        recipientIds.map((userId) =>
          NotificationService.trigger({
            userId,
            type: "MINI_PRESENTATION_SCHEDULED",
            title: "Mini-presentation scheduled",
            message:
              `A mini-presentation has been scheduled for "${i.topic.title}".\n` +
              `When: ${niceDate}\nRoom: ${data.room}\nTime slot: ${data.timeSlot}\n` +
              `Document deadline: ${data.documentDeadline.toLocaleDateString("en-GB")}`,
            relatedId: row.id,
            relatedType: "MiniPresentation",
            link: "/student/documents",
          }).catch(() => null),
        ),
      );
    }

    await AuditService.log({
      userId: scheduledById,
      action: "MINI_PRESENTATION_BULK_SCHEDULED",
      targetType: "MiniPresentation",
      targetId: `bulk:${data.filiereId ?? "all"}`,
      details: {
        title: data.title,
        scheduledAt: data.scheduledAt.toISOString(),
        filiereId: data.filiereId ?? null,
        created,
        skipped,
      },
    }).catch((err) => console.error("[mini-presentation] audit failed:", err));

    return { created, skipped, total: internships.length };
  }

  /**
   * Bulk schedule a milestone with per-internship slots: each team gets its
   * own presentation time + room, but the document submission deadline is
   * shared across the cohort. Replaces the older "same time/room for all"
   * flow once the admin starts using the per-slot form.
   *
   * Skips internships that already have a milestone with the same title
   * (idempotent — re-submitting the form won't double-schedule).
   */
  static async scheduleBulkWithSlots(
    data: BulkScheduleSlotsPayload,
    scheduledById: string,
  ): Promise<{ created: number; skipped: number; total: number }> {
    if (data.slots.length === 0) {
      throw new Error("At least one internship slot is required.");
    }

    const now = Date.now();
    for (const s of data.slots) {
      if (s.scheduledAt.getTime() < now) {
        throw new Error("Every presentation date must be in the future.");
      }
      if (data.documentDeadline.getTime() > s.scheduledAt.getTime()) {
        throw new Error(
          "The document submission deadline must be on or before every presentation date.",
        );
      }
    }

    const internshipIds = data.slots.map((s) => s.internshipId);
    const internships = await prisma.internship.findMany({
      where: {
        id: { in: internshipIds },
        internshipType: "PFE",
        status: { notIn: ["CANCELLED", "COMPLETED"] },
      },
      select: {
        id: true,
        teacherId: true,
        topic: { select: { title: true } },
        internshipstudent: { select: { studentId: true } },
        minipresentation: {
          where: { title: data.title.trim() },
          select: { id: true },
        },
      } as any,
    });

    if (internships.length === 0) {
      throw new Error("No active PFE internships matched the selected slots.");
    }

    const byId = new Map((internships as any[]).map((i) => [i.id, i]));
    let created = 0;
    let skipped = 0;

    for (const slot of data.slots) {
      const i = byId.get(slot.internshipId);
      if (!i) {
        // Slot referenced an internship that's CANCELLED/COMPLETED or simply
        // doesn't exist anymore. Skip silently rather than error the whole batch.
        skipped++;
        continue;
      }
      if ((i.minipresentation ?? []).length > 0) {
        skipped++;
        continue;
      }

      const row = await prisma.miniPresentation.create({
        data: {
          id: randomUUID(),
          internshipId: i.id,
          title: data.title.trim(),
          scheduledAt: slot.scheduledAt,
          room: slot.room.trim(),
          timeSlot: slot.timeSlot.trim(),
          documentDeadline: data.documentDeadline,
        },
      });
      created++;

      const niceDate = slot.scheduledAt.toLocaleString("en-GB", {
        dateStyle: "full",
        timeStyle: "short",
      });
      const recipients = [
        i.teacherId,
        ...i.internshipstudent.map((s: { studentId: string }) => s.studentId),
      ];
      await Promise.all(
        recipients.map((userId) =>
          NotificationService.trigger({
            userId,
            type: "MINI_PRESENTATION_SCHEDULED",
            title: "Mini-presentation scheduled",
            message:
              `A mini-presentation has been scheduled for "${i.topic.title}".\n` +
              `When: ${niceDate}\nRoom: ${slot.room}\nTime slot: ${slot.timeSlot}\n` +
              `Document deadline: ${data.documentDeadline.toLocaleDateString("en-GB")}`,
            relatedId: row.id,
            relatedType: "MiniPresentation",
            link: "/student/documents",
          }).catch(() => null),
        ),
      );
    }

    await AuditService.log({
      userId: scheduledById,
      action: "MINI_PRESENTATION_BULK_SCHEDULED_WITH_SLOTS",
      targetType: "MiniPresentation",
      targetId: `bulk-slots:${data.title.trim()}`,
      details: {
        title: data.title,
        documentDeadline: data.documentDeadline.toISOString(),
        slotCount: data.slots.length,
        created,
        skipped,
      },
    }).catch((err) => console.error("[mini-presentation] audit failed:", err));

    return { created, skipped, total: data.slots.length };
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

  /**
   * Student attaches a document to a milestone. Hard rule: once the deadline
   * has passed the milestone is locked — the cron flips it to MISSED and no
   * further uploads are accepted. This keeps the deadline meaningful and
   * prevents "submit it anyway, mark it late" workarounds.
   */
  static async submit(
    id: string,
    file: { url: string; name: string },
    actorId: string,
  ) {
    const milestone = await prisma.miniPresentation.findUnique({
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
    if (!milestone) throw new Error("Milestone not found");

    const isStudentOnTeam = milestone.internship.internshipstudent.some(
      (s) => s.studentId === actorId,
    );
    if (!isStudentOnTeam) throw new Error("You are not part of this internship");

    if (milestone.status === "CANCELLED") {
      throw new Error("This milestone has been cancelled");
    }
    if (milestone.status === "MISSED") {
      throw new Error("The deadline for this milestone has passed — submissions are closed.");
    }
    if (Date.now() > milestone.documentDeadline.getTime()) {
      // Defence in depth: the cron usually flips status to MISSED, but there
      // can be up to ~15 min of lag before it runs. Block here too.
      throw new Error("The deadline for this milestone has passed — submissions are closed.");
    }

    const now = new Date();
    const updated = await prisma.miniPresentation.update({
      where: { id },
      data: {
        documentUrl: file.url,
        documentName: file.name,
        submittedAt: now,
        status: "DOCUMENT_SUBMITTED",
      },
    });

    await AuditService.log({
      userId: actorId,
      action: "MILESTONE_SUBMITTED",
      targetType: "MiniPresentation",
      targetId: id,
      details: { fileName: file.name, deadline: milestone.documentDeadline.toISOString() },
    }).catch((err) => console.error("[mini-presentation] audit failed:", err));

    await NotificationService.trigger({
      userId: milestone.internship.teacherId,
      type: "DOCUMENT_UPLOADED",
      title: "Milestone Document Submitted",
      message: `A document was submitted for milestone "${milestone.title}" on "${milestone.internship.topic.title}".`,
      relatedId: id,
      relatedType: "MiniPresentation",
      link: "/teacher/internships",
    }).catch(() => null);

    return updated;
  }

  /**
   * Cron entry point. Walks every active PFE milestone and:
   *  - fires the 24h / 4h / 1h pre-deadline reminders (once each, idempotent
   *    via `remindedAt24h/4h/1h` columns)
   *  - flips missed milestones (deadline passed, no upload) to MISSED
   *    and pings the department admin once.
   * Safe to call as often as the cron runs; each branch is guarded by a
   * "have we done this already" timestamp.
   *
   * IMPORTANT: with Vercel Hobby's once-daily cron only the 24h reminder
   * lands reliably — the 4h and 1h windows are too narrow to be hit by a
   * once-a-day run unless the deadline happens to fall ~4h/1h after the
   * cron's fixed time. The branches stay in place so a sub-daily cadence
   * (Pro plan, GitHub Actions, external scheduler) Just Works without
   * code changes.
   */
  static async runDeadlineSweep() {
    const now = new Date();
    const upcoming = await prisma.miniPresentation.findMany({
      where: {
        status: "SCHEDULED",
        documentDeadline: { gt: new Date(now.getTime() - 60 * 60 * 1000) },
      },
      include: {
        internship: {
          select: {
            teacherId: true,
            topic: { select: { title: true, filiereId: true } },
            internshipstudent: { select: { studentId: true } },
          },
        },
      },
    });

    const sent = { r24: 0, r4: 0, r1: 0, missed: 0 };

    for (const m of upcoming) {
      const minsToDeadline = (m.documentDeadline.getTime() - now.getTime()) / 60000;
      const recipients = [
        ...m.internship.internshipstudent.map((s) => s.studentId),
        m.internship.teacherId,
      ];

      // 24h ± 30 min
      if (!m.remindedAt24h && minsToDeadline > 23 * 60 - 30 && minsToDeadline <= 25 * 60) {
        await Promise.all(
          recipients.map((uid) =>
            NotificationService.trigger({
              userId: uid,
              type: "MINI_PRESENTATION_REMINDER",
              title: "Milestone Deadline in 24h",
              message: `The document deadline for "${m.title}" (${m.internship.topic.title}) is in about 24 hours (${m.documentDeadline.toLocaleString()}).`,
              relatedId: m.id,
              relatedType: "MiniPresentation",
              link: "/student/documents",
            }).catch(() => null),
          ),
        );
        await prisma.miniPresentation.update({ where: { id: m.id }, data: { remindedAt24h: now } });
        sent.r24++;
      }

      // 4h ± 30 min
      if (!m.remindedAt4h && minsToDeadline > 4 * 60 - 30 && minsToDeadline <= 4 * 60 + 30) {
        await Promise.all(
          recipients.map((uid) =>
            NotificationService.trigger({
              userId: uid,
              type: "MINI_PRESENTATION_REMINDER",
              title: "Milestone Deadline in 4h",
              message: `Only 4 hours left to submit "${m.title}" (${m.internship.topic.title}). Deadline: ${m.documentDeadline.toLocaleString()}.`,
              relatedId: m.id,
              relatedType: "MiniPresentation",
              link: "/student/documents",
            }).catch(() => null),
          ),
        );
        await prisma.miniPresentation.update({ where: { id: m.id }, data: { remindedAt4h: now } });
        sent.r4++;
      }

      // 1h ± 30 min
      if (!m.remindedAt1h && minsToDeadline > 30 && minsToDeadline <= 90) {
        await Promise.all(
          recipients.map((uid) =>
            NotificationService.trigger({
              userId: uid,
              type: "MINI_PRESENTATION_REMINDER",
              title: "Milestone Deadline in 1h",
              message: `Last hour to submit "${m.title}" (${m.internship.topic.title}). Deadline: ${m.documentDeadline.toLocaleString()}.`,
              relatedId: m.id,
              relatedType: "MiniPresentation",
              link: "/student/documents",
            }).catch(() => null),
          ),
        );
        await prisma.miniPresentation.update({ where: { id: m.id }, data: { remindedAt1h: now } });
        sent.r1++;
      }

      // Deadline passed with no upload → flip to MISSED (terminal) and ping
      // the admin. Submissions are closed; the student can't recover the
      // milestone once it's flipped.
      if (
        minsToDeadline <= 0 &&
        !m.documentUrl &&
        !m.missedNotifiedAt &&
        m.status === "SCHEDULED"
      ) {
        await prisma.miniPresentation.update({
          where: { id: m.id },
          data: {
            status: "MISSED",
            missedNotifiedAt: now,
          },
        });

        const admins = await prisma.user.findMany({
          where: {
            role: "ADMIN",
            OR: [
              { adminprofile: { isSuperAdmin: true } },
              ...(m.internship.topic.filiereId
                ? [{ adminprofile: { filiereId: m.internship.topic.filiereId } }]
                : []),
            ],
          } as any,
          select: { id: true },
        });
        await Promise.all(
          admins.map((a: { id: string }) =>
            NotificationService.trigger({
              userId: a.id,
              type: "DEADLINE_OVERDUE",
              title: "Milestone Deadline Missed",
              message: `"${m.title}" for "${m.internship.topic.title}" passed its document deadline with no submission. Submissions are now closed.`,
              relatedId: m.id,
              relatedType: "MiniPresentation",
              link: "/admin/milestones",
            }).catch(() => null),
          ),
        );
        await Promise.all(
          m.internship.internshipstudent.map((s) =>
            NotificationService.trigger({
              userId: s.studentId,
              type: "DEADLINE_OVERDUE",
              title: "Milestone Deadline Missed",
              message: `The deadline for "${m.title}" has passed without a submission. Submissions are now closed; please contact the administration.`,
              relatedId: m.id,
              relatedType: "MiniPresentation",
              link: "/student/documents",
            }).catch(() => null),
          ),
        );
        sent.missed++;
      }
    }

    return sent;
  }
}
