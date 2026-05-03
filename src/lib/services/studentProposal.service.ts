import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { isEligibleForType } from '@/types/internship';
import type { InternshipType, StudentLevel } from '@/types/internship';
import type { StudentProposedTopicInput } from '@/types/topic';
import { AuditService } from './audit.service';
import { NotificationService } from './notification.service';
import { SettingsService } from './settings.service';

export class StudentProposalService {
  // ─── Submit proposal (PATH B) ─────────────────────────────────────────────

  /**
   * A student submits a topic proposal for a company they found independently.
   * Validates level eligibility and ensures no duplicate active proposal.
   */
  static async submitProposal(
    studentId: string,
    studentLevel: StudentLevel | null | undefined,
    data: StudentProposedTopicInput,
  ) {
    // 1. Enforce type eligibility based on student level
    if (!isEligibleForType(studentLevel, data.internshipType)) {
      throw new Error(
        `Students at level ${studentLevel} can only propose NORMAL internships`,
      );
    }

    // 2. Prevent duplicate active proposals
    const existingProposal = await prisma.topic.findFirst({
      where: {
        proposedById: studentId,
        proposedByStudent: true,
        status: {
          in: ['PENDING_ADMIN', 'PENDING_TEACHER', 'APPROVED'],
        },
      },
    });

    if (existingProposal) {
      throw new Error(
        'You already have an active proposal. Wait for it to be reviewed before submitting another.',
      );
    }

    const academicYear = await SettingsService.getCurrentAcademicYear();

    const topic = await prisma.$transaction(async (tx) => {
      const created = await tx.topic.create({
        data: {
          id: randomUUID(),
          title: data.title,
          description: data.description,
          requiredSkills: data.requiredSkills,
          type: 'STUDENT_PROPOSED',
          internshipType: data.internshipType,
          status: 'PENDING_ADMIN',
          academicYear,
          proposedById: studentId,
          // PATH B specific fields
          proposedByStudent: true,
          directAssigneeId: studentId,
          companyName: data.companyName,
          companySector: data.companySector,
          companyAddress: data.companyAddress,
          companyCity: data.companyCity,
          contactPerson: data.contactPerson,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          supportingDocUrl: data.supportingDocUrl,
          updatedAt: new Date(),
        },
      });

      // Create admin validation step
      await tx.validation.create({
        data: {
          id: randomUUID(),
          topicId: created.id,
          validatorId: 'SYSTEM',
          step: 'ADMIN',
          status: 'PENDING',
        },
      });

      return created;
    });

    await AuditService.log({
      userId: studentId,
      action: 'STUDENT_TOPIC_SUBMITTED',
      targetType: 'Topic',
      targetId: topic.id,
      details: { internshipType: data.internshipType, companyName: data.companyName },
    });

    return topic;
  }

  // ─── Admin approves proposal ──────────────────────────────────────────────

  /**
   * Admin approves a student proposal:
   * - Publishes the topic as TAKEN (no open application step)
   * - Directly assigns the internship to the proposing student
   * - Registers/links the company if they exist in the system
   */
  static async approveProposal(
    topicId: string,
    adminId: string,
    teacherId: string,
  ) {
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: { proposedBy: true },
    });

    if (!topic) throw new Error('Topic not found');
    if (!topic.proposedByStudent) throw new Error('Not a student-proposed topic');
    if (!topic.directAssigneeId) throw new Error('No direct assignee on this proposal');

    // Check teacher capacity before assignment
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: teacherId },
    });
    if (!teacherProfile || teacherProfile.currentLoad >= teacherProfile.maxStudents) {
      throw new Error('Selected teacher is at full supervision capacity');
    }

    const academicYear = await SettingsService.getCurrentAcademicYear();

    await prisma.$transaction(async (tx) => {
      // 1. Mark topic as TAKEN and assign teacher
      await tx.topic.update({
        where: { id: topicId },
        data: {
          status: 'TAKEN',
          assignedTeacherId: teacherId,
          updatedAt: new Date(),
        },
      });

      // 2. Create internship directly assigned to the proposing student
      const internship = await tx.internship.create({
        data: {
          id: randomUUID(),
          topicId,
          teacherId,
          academicYear,
          status: 'REQUESTED',
          internshipType: topic.internshipType ?? 'PFE',
          updatedAt: new Date(),
          students: {
            create: {
              id: randomUUID(),
              studentId: topic.directAssigneeId!,
              isLeader: true,
            },
          },
        },
      });

      // 3. Increment teacher load
      await tx.teacherProfile.update({
        where: { userId: teacherId },
        data: {
          currentLoad: { increment: 1 },
          isAvailable: teacherProfile.currentLoad + 1 < teacherProfile.maxStudents,
        },
      });

      await AuditService.log({
        userId: adminId,
        action: 'STUDENT_TOPIC_APPROVED',
        targetType: 'Topic',
        targetId: topicId,
        details: { internshipId: internship.id },
      });
    });

    // 4. Notify student and teacher
    await NotificationService.trigger({
      userId: topic.directAssigneeId,
      type: 'STUDENT_TOPIC_APPROVED',
      title: 'Your Proposal Was Approved!',
      message: `Your topic proposal "${topic.title}" has been approved. Your internship has been created.`,
      relatedId: topicId,
      relatedType: 'Topic',
      link: '/student/internship',
    });

    await NotificationService.trigger({
      userId: teacherId,
      type: 'TEACHER_ASSIGNED',
      title: 'New Supervision Assignment',
      message: `You have been assigned to supervise "${topic.title}" from a student proposal.`,
      relatedId: topicId,
      relatedType: 'Topic',
      link: '/teacher/internships',
    });
  }

  // ─── Admin rejects proposal ───────────────────────────────────────────────

  /**
   * Admin rejects a student proposal with a comment.
   * The student is notified and can revise and resubmit.
   */
  static async rejectProposal(topicId: string, adminId: string, comment: string) {
    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) throw new Error('Topic not found');

    await prisma.topic.update({
      where: { id: topicId },
      data: {
        status: 'REJECTED',
        rejectionReason: comment,
        updatedAt: new Date(),
      },
    });

    await AuditService.log({
      userId: adminId,
      action: 'STUDENT_TOPIC_REJECTED',
      targetType: 'Topic',
      targetId: topicId,
      details: { reason: comment },
    });

    await NotificationService.trigger({
      userId: topic.proposedById,
      type: 'STUDENT_TOPIC_REJECTED',
      title: 'Proposal Rejected',
      message: `Your proposal "${topic.title}" was rejected. Reason: ${comment}. You may revise and resubmit.`,
      relatedId: topicId,
      relatedType: 'Topic',
      link: '/student/topics/propose',
    });
  }
}
