import prisma from '@/lib/prisma';
import { internship_status, internship_type } from '@prisma/client';
import { addDays, subDays, differenceInDays } from 'date-fns';
import type { InternshipDeadlines } from '@/types/internship';
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
    type: internship_type,
  ): InternshipDeadlines {
    const durationDays = differenceInDays(endDate, startDate);

    return {
      midtermDeadline:
        type === internship_type.PFE
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

    const internshipType: internship_type = internship.internshipType ?? internship_type.PFE;
    const { midtermDeadline, finalDeadline } = this.calculateDeadlines(
      startDate,
      endDate,
      internshipType,
    );

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.internship.update({
        where: { id: internshipId },
        data: {
          status: internship_status.IN_PROGRESS,
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
        details: { startDate, endDate, internshipType },
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

  // ─── Send Document ─────────────────────────────────────────────────────────

  /**
   * Admin marks the convention/document as sent to the company.
   * Status → DOCUMENT_SENT.
   */
  static async sendDocument(internshipId: string, adminId: string) {
    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
    });

    if (!internship) throw new Error('Internship not found');
    if (internship.status !== internship_status.REQUESTED) {
      throw new Error('Only internships in REQUESTED status can be marked as document sent.');
    }

    const updated = await prisma.internship.update({
      where: { id: internshipId },
      data: {
        status: internship_status.DOCUMENT_SENT,
        updatedAt: new Date(),
      },
    });

    await AuditService.log({
      userId: adminId,
      action: 'INTERNSHIP_DOCUMENT_SENT',
      targetType: 'Internship',
      targetId: internshipId,
    });

    // Notify student and teacher
    const recipients = [
      ...await prisma.internshipStudent.findMany({
        where: { internshipId },
        select: { studentId: true }
      }).then(students => students.map(s => s.studentId)),
      internship.teacherId,
    ];

    for (const userId of recipients) {
      await NotificationService.trigger({
        userId,
        type: 'DOCUMENT_UPLOADED', // Reusing appropriate type or mapping to a generic one
        title: 'Convention Sent to Company',
        message: 'The internship convention has been sent to the host company for confirmation.',
        relatedId: internshipId,
        relatedType: 'Internship',
        link: '/student/internship',
      });
    }

    return updated;
  }

  // ─── Final Report Submission ───────────────────────────────────────────────

  /**
   * Student submits the final report.
   * Sets status → FINAL_REPORT_SUBMITTED and notifies teacher and company.
   */
  static async submitFinalReport(internshipId: string, studentId: string) {
    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
      include: {
        students: { select: { studentId: true } },
        teacher: { select: { id: true } },
        topic: {
          select: {
            proposedById: true,
            internshipType: true,
          },
        },
      },
    });

    if (!internship) throw new Error('Internship not found');
    if (internship.status !== internship_status.IN_PROGRESS) {
      throw new Error('The internship must be IN_PROGRESS to submit the final report.');
    }

    // Verify the actor is a student on this internship
    const isStudent = internship.students.some((s) => s.studentId === studentId);
    if (!isStudent) throw new Error('You are not a student on this internship.');

    await prisma.$transaction(async (tx) => {
      await tx.internship.update({
        where: { id: internshipId },
        data: {
          status: internship_status.FINAL_REPORT_SUBMITTED,
          // Reset validation flags in case of resubmission after revision
          teacherValidatedFinalReport: false,
          teacherValidatedAt: null,
          companyValidatedFinalReport: false,
          companyValidatedAt: null,
          updatedAt: new Date(),
        },
      });

      await AuditService.log({
        userId: studentId,
        action: 'FINAL_REPORT_SUBMITTED',
        targetType: 'Internship',
        targetId: internshipId,
      });
    });

    // Notify teacher (always) and company (topic proposer)
    const notifyIds: string[] = [internship.teacherId, internship.topic.proposedById];

    for (const userId of notifyIds) {
      await NotificationService.trigger({
        userId,
        type: 'FINAL_REPORT_SUBMITTED',
        title: 'Final Report Submitted',
        message: 'A student has submitted their final internship report. Please review and validate it.',
        relatedId: internshipId,
        relatedType: 'Internship',
        link: '/teacher/internships',
      });
    }
  }

  // ─── Teacher Validates Final Report ───────────────────────────────────────

  /**
   * Teacher validates the submitted final report.
   * If the company has already validated, status advances to PENDING_ADMIN_CONFIRMATION.
   */
  static async teacherValidateFinalReport(internshipId: string, teacherId: string) {
    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
      include: {
        students: { select: { studentId: true } },
        topic: { select: { proposedById: true } },
      },
    });

    if (!internship) throw new Error('Internship not found');
    if (internship.status !== internship_status.FINAL_REPORT_SUBMITTED) {
      throw new Error('No final report is pending validation.');
    }
    if (internship.teacherId !== teacherId) {
      throw new Error('You are not the supervisor of this internship.');
    }
    if (internship.teacherValidatedFinalReport) {
      throw new Error('You have already validated this final report.');
    }

    const bothValidated = internship.companyValidatedFinalReport;
    const newStatus: internship_status = bothValidated ? internship_status.PENDING_ADMIN_CONFIRMATION : internship_status.FINAL_REPORT_SUBMITTED;

    await prisma.$transaction(async (tx) => {
      await tx.internship.update({
        where: { id: internshipId },
        data: {
          teacherValidatedFinalReport: true,
          teacherValidatedAt: new Date(),
          status: newStatus,
          updatedAt: new Date(),
        },
      });

      await AuditService.log({
        userId: teacherId,
        action: 'FINAL_REPORT_TEACHER_VALIDATED',
        targetType: 'Internship',
        targetId: internshipId,
      });
    });

    // Notify students
    for (const { studentId } of internship.students) {
      await NotificationService.trigger({
        userId: studentId,
        type: 'FINAL_REPORT_TEACHER_VALIDATED',
        title: 'Teacher Validated Your Final Report',
        message: 'Your supervisor has approved your final report. Awaiting company validation.',
        relatedId: internshipId,
        relatedType: 'Internship',
        link: '/student/internship',
      });
    }

    // If both gates passed — also notify the admin
    if (bothValidated) {
      await this._notifyAdminPendingConfirmation(internshipId);
    }
  }

  // ─── Company Validates Final Report ───────────────────────────────────────

  /**
   * Company validates the submitted final report.
   * If the teacher has already validated, status advances to PENDING_ADMIN_CONFIRMATION.
   */
  static async companyValidateFinalReport(internshipId: string, companyUserId: string) {
    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
      include: {
        students: { select: { studentId: true } },
        topic: { select: { proposedById: true } },
      },
    });

    if (!internship) throw new Error('Internship not found');
    if (internship.status !== internship_status.FINAL_REPORT_SUBMITTED) {
      throw new Error('No final report is pending validation.');
    }
    if (internship.topic.proposedById !== companyUserId) {
      throw new Error('You are not the company associated with this internship.');
    }
    if (internship.companyValidatedFinalReport) {
      throw new Error('Your organisation has already validated this final report.');
    }

    const bothValidated = internship.teacherValidatedFinalReport;
    const newStatus: internship_status = bothValidated ? internship_status.PENDING_ADMIN_CONFIRMATION : internship_status.FINAL_REPORT_SUBMITTED;

    await prisma.$transaction(async (tx) => {
      await tx.internship.update({
        where: { id: internshipId },
        data: {
          companyValidatedFinalReport: true,
          companyValidatedAt: new Date(),
          status: newStatus,
          updatedAt: new Date(),
        },
      });

      await AuditService.log({
        userId: companyUserId,
        action: 'FINAL_REPORT_COMPANY_VALIDATED',
        targetType: 'Internship',
        targetId: internshipId,
      });
    });

    // Notify students
    for (const { studentId } of internship.students) {
      await NotificationService.trigger({
        userId: studentId,
        type: 'FINAL_REPORT_COMPANY_VALIDATED',
        title: 'Company Validated Your Final Report',
        message: 'The company supervisor has approved your final report. Awaiting teacher validation.',
        relatedId: internshipId,
        relatedType: 'Internship',
        link: '/student/internship',
      });
    }

    // If both gates passed — notify the admin
    if (bothValidated) {
      await this._notifyAdminPendingConfirmation(internshipId);
    }
  }

  // ─── Admin final confirmation + completion ─────────────────────────────────

  /**
   * Admin confirms the final report after both teacher and company have validated.
   * Sets status → COMPLETED. Decrements teacher load.
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
    if (internship.status !== internship_status.PENDING_ADMIN_CONFIRMATION) {
      throw new Error(
        'Both the teacher and company must validate the final report before admin can confirm completion.',
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.internship.update({
        where: { id: internshipId },
        data: {
          status: internship_status.COMPLETED,
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await AuditService.log({
        userId: adminId,
        action: 'INTERNSHIP_COMPLETED',
        targetType: 'Internship',
        targetId: internshipId,
      });
    });

    // Decrement teacher load
    await TeacherLoadService.decrement(internship.teacherId);

    // Notify: students + teacher + company
    const notifyIds = [
      ...internship.students.map((s) => s.studentId),
      internship.teacherId,
      internship.topic.proposedById,
    ];

    for (const userId of notifyIds) {
      await NotificationService.trigger({
        userId,
        type: 'FINAL_REPORT_ADMIN_CONFIRMED',
        title: 'Internship Officially Completed',
        message:
          'The administration has confirmed your final report. The internship is now archived as completed.',
        relatedId: internshipId,
        relatedType: 'Internship',
        link: '/student/internship',
      });
    }
  }

  // ─── Revision request ─────────────────────────────────────────────────────

  /**
   * Admin, teacher, or company requests a revision on the final report.
   * Resets validation flags and sets status → NEEDS_REVISION.
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

    await prisma.$transaction(async (tx) => {
      await tx.internship.update({
        where: { id: internshipId },
        data: {
          status: internship_status.NEEDS_REVISION,
          // Reset validation gates so the student must resubmit
          teacherValidatedFinalReport: false,
          teacherValidatedAt: null,
          companyValidatedFinalReport: false,
          companyValidatedAt: null,
          updatedAt: new Date(),
        },
      });

      await AuditService.log({
        userId: actorId,
        action: 'REVISION_REQUESTED',
        targetType: 'Internship',
        targetId: internshipId,
        details: { comment },
      });
    });

    for (const { studentId } of internship.students) {
      await NotificationService.trigger({
        userId: studentId,
        type: 'REVISION_REQUESTED',
        title: 'Revision Required',
        message: `Your final report submission requires revision. Comment: ${comment}`,
        relatedId: internshipId,
        relatedType: 'Internship',
        link: '/student/documents',
      });
    }
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private static async _notifyAdminPendingConfirmation(internshipId: string) {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    });

    for (const admin of admins) {
      await NotificationService.trigger({
        userId: admin.id,
        type: 'FINAL_REPORT_ADMIN_CONFIRMED',
        title: 'Final Report Ready for Confirmation',
        message:
          'Both the teacher and company have validated the final report. Please review and confirm completion.',
        relatedId: internshipId,
        relatedType: 'Internship',
        link: '/admin/internships',
      });
    }
  }
}
