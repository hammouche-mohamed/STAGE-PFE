import prisma from '@/lib/prisma';
import { addDays, subDays, differenceInDays } from 'date-fns';
import { randomUUID } from 'crypto';
import type { InternshipType, InternshipDeadlines } from '@/types/internship';
import { AuditService } from './audit.service';
import { NotificationService } from './notification.service';
import { TeacherLoadService } from './teacherLoad.service';

export class InternshipService {
  // ─── Deadline calculation ──────────────────────────────────────────────────

  /**
   * Calculates midterm and final deadlines based on internship type.
   *
   * PFE:    midtermDeadline = startDate + floor(duration / 2) days
   *         finalDeadline   = endDate − 7 days
   * NORMAL: midtermDeadline = null  ← never required, never alerted
   *         finalDeadline   = endDate − 7 days
   */
  static calculateDeadlines(
    startDate: Date,
    endDate: Date,
    type: InternshipType,
  ): InternshipDeadlines {
    const durationDays = differenceInDays(endDate, startDate);

    return {
      midtermDeadline:
        type === 'PFE'
          ? addDays(startDate, Math.floor(durationDays / 2))
          : null, // NORMAL → never required
      finalDeadline: subDays(endDate, 7),
    };
  }

  // ─── Activation ───────────────────────────────────────────────────────────

  /**
   * Called when the company confirms internship dates.
   * Sets status → IN_PROGRESS and auto-calculates deadlines.
   */
  static async activateInternship(
    internshipId: string,
    startDate: Date,
    endDate: Date,
    technicalSupervisorName: string,
    technicalSupervisorEmail: string,
    actorId: string,
  ) {
    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
      include: {
        students: { select: { studentId: true } },
        teacher: { select: { id: true, name: true } },
      },
    });

    if (!internship) throw new Error('Internship not found');

    const type = internship.internshipType ?? 'PFE';
    const { midtermDeadline, finalDeadline } = this.calculateDeadlines(
      startDate,
      endDate,
      type as InternshipType,
    );

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.internship.update({
        where: { id: internshipId },
        data: {
          status: 'IN_PROGRESS',
          startDate,
          endDate,
          midtermDeadline,
          finalDeadline,
          technicalSupervisorName,
          technicalSupervisorEmail,
          activatedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await AuditService.log({
        userId: actorId,
        action: 'INTERNSHIP_ACTIVATED',
        targetType: 'Internship',
        targetId: internshipId,
        details: { startDate, endDate, type },
      });

      return result;
    });

    // Notify all parties
    const recipients = [
      ...internship.students.map((s) => s.studentId),
      internship.teacherId,
    ];

    for (const userId of recipients) {
      await NotificationService.trigger({
        userId,
        type: 'COMPANY_DATES_CONFIRMED',
        title: 'Internship Activated',
        message: `Your internship has officially started. Start: ${startDate.toLocaleDateString()}, End: ${endDate.toLocaleDateString()}.`,
        relatedId: internshipId,
        relatedType: 'Internship',
        link: '/student/internship',
      });
    }

    return updated;
  }

  // ─── Admin final approval + completion ────────────────────────────────────

  /**
   * Admin approves the final report → APPROVED → immediately COMPLETED.
   * Also decrements teacher load and inserts audit entry.
   */
  static async completeInternship(internshipId: string, adminId: string) {
    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
      include: {
        students: { select: { studentId: true } },
        teacher: { select: { id: true } },
        topic: { select: { proposedById: true } },
      },
    });

    if (!internship) throw new Error('Internship not found');

    await prisma.$transaction(async (tx) => {
      // 1. Mark as APPROVED then COMPLETED in one update (as per spec)
      await tx.internship.update({
        where: { id: internshipId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // 2. Audit log
      await AuditService.log({
        userId: adminId,
        action: 'INTERNSHIP_COMPLETED',
        targetType: 'Internship',
        targetId: internshipId,
      });
    });

    // 3. Decrement teacher load
    await TeacherLoadService.decrement(internship.teacherId);

    // 4. Notify: students + teacher + company (topic proposer)
    const notifyIds = [
      ...internship.students.map((s) => s.studentId),
      internship.teacherId,
      internship.topic.proposedById, // company user
    ];

    for (const userId of notifyIds) {
      await NotificationService.trigger({
        userId,
        type: 'INTERNSHIP_COMPLETED',
        title: 'Internship Completed',
        message:
          'The internship has been officially completed and archived by the administration.',
        relatedId: internshipId,
        relatedType: 'Internship',
        link: '/student/internship',
      });
    }
  }

  // ─── Revision request ─────────────────────────────────────────────────────

  /**
   * Admin or teacher requests a revision.
   * Sets status → NEEDS_REVISION and notifies the student.
   */
  static async requestRevision(
    internshipId: string,
    actorId: string,
    comment: string,
  ) {
    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
      include: { students: { select: { studentId: true } } },
    });

    if (!internship) throw new Error('Internship not found');

    await prisma.internship.update({
      where: { id: internshipId },
      data: { status: 'NEEDS_REVISION', updatedAt: new Date() },
    });

    await AuditService.log({
      userId: actorId,
      action: 'REVISION_REQUESTED',
      targetType: 'Internship',
      targetId: internshipId,
      details: { comment },
    });

    for (const { studentId } of internship.students) {
      await NotificationService.trigger({
        userId: studentId,
        type: 'REVISION_REQUESTED',
        title: 'Revision Required',
        message: `Your submission requires revision. Comment: ${comment}`,
        relatedId: internshipId,
        relatedType: 'Internship',
        link: '/student/documents',
      });
    }
  }
}
