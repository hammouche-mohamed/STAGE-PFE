import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { addHours } from 'date-fns';
import { AuditService } from './audit.service';
import { NotificationService } from './notification.service';

const INVITATION_EXPIRY_HOURS = 48;

export class BinomeService {
  // ─── Send invitation ───────────────────────────────────────────────────────

  /**
   * Student A sends a binôme invitation to Student B for an existing application.
   *
   * Constraints enforced:
   * - Cannot invite yourself
   * - Receiver must not already have an active application
   * - Both must be at the same academic level
   * - Invitation expires after 48 hours
   */
  static async sendInvitation(
    applicationId: string,
    senderId: string,
    receiverId: string,
    message: string | undefined,
  ) {
    if (senderId === receiverId) {
      throw new Error('You cannot invite yourself');
    }

    const application = await prisma.studentApplication.findUnique({
      where: { id: applicationId },
      include: {
        topic: { select: { id: true, title: true, internshipType: true } },
        leader: { include: { studentProfile: true } },
      },
    });

    if (!application) throw new Error('Application not found');
    if (application.leaderId !== senderId) throw new Error('Not your application');

    // Check receiver exists and is a student
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      include: { studentProfile: true },
    });

    if (!receiver || receiver.role !== 'STUDENT') {
      throw new Error('Receiver must be a registered student');
    }

    // Both students must be at the same academic level
    const senderLevel = application.leader.studentProfile?.level;
    const receiverLevel = receiver.studentProfile?.level;

    if (senderLevel && receiverLevel && senderLevel !== receiverLevel) {
      throw new Error(
        `Both students must be at the same level (you: ${senderLevel}, partner: ${receiverLevel})`,
      );
    }

    // Receiver must not already hold an active application
    const receiverActiveApp = await prisma.studentApplication.findFirst({
      where: {
        OR: [{ leaderId: receiverId }, { partnerId: receiverId }],
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
    });

    if (receiverActiveApp) {
      throw new Error('This student already has an active application');
    }

    // Check for existing pending invitation on this application
    const existingInvitation = await prisma.binomeInvitation.findUnique({
      where: { studentApplicationId: applicationId },
    });

    if (existingInvitation && existingInvitation.status === 'PENDING') {
      throw new Error('A pending invitation already exists for this application');
    }

    const invitation = await prisma.$transaction(async (tx) => {
      // Mark application as binôme
      await tx.studentApplication.update({
        where: { id: applicationId },
        data: { isBinome: true, partnerId: receiverId },
      });

      const inv = await tx.binomeInvitation.create({
        data: {
          id: randomUUID(),
          studentApplicationId: applicationId,
          invitedStudentId: receiverId,
          status: 'PENDING',
          message,
          expiresAt: addHours(new Date(), INVITATION_EXPIRY_HOURS),
        },
      });

      await AuditService.log({
        userId: senderId,
        action: 'BINOME_INVITATION_SENT',
        targetType: 'BinomeInvitation',
        targetId: inv.id,
        details: { receiverId, applicationId },
      });

      return inv;
    });

    // Notify receiver
    const senderUser = await prisma.user.findUnique({
      where: { id: senderId },
      select: { name: true },
    });

    await NotificationService.trigger({
      userId: receiverId,
      type: 'BINOME_INVITATION',
      title: 'Binôme Invitation Received',
      message: `${senderUser?.name ?? 'A student'} has invited you to apply together for "${application.topic.title}". Expires in 48 hours.`,
      relatedId: invitation.id,
      relatedType: 'BinomeInvitation',
      link: '/student/invitations',
    });

    return invitation;
  }

  // ─── Respond to invitation ────────────────────────────────────────────────

  /**
   * Student B accepts or declines the binôme invitation.
   *
   * On ACCEPT: application becomes active (visible to admin).
   * On DECLINE: application isBinome is reset; sender can invite another partner.
   */
  static async respondToInvitation(
    invitationId: string,
    userId: string,
    accept: boolean,
  ) {
    const invitation = await prisma.binomeInvitation.findUnique({
      where: { id: invitationId },
      include: {
        application: {
          include: {
            topic: { select: { title: true } },
            leader: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!invitation) throw new Error('Invitation not found');
    if (invitation.invitedStudentId !== userId) throw new Error('Not your invitation');
    if (invitation.status !== 'PENDING') throw new Error('Invitation is no longer pending');

    // Check expiry
    if (new Date() > invitation.expiresAt) {
      await prisma.binomeInvitation.update({
        where: { id: invitationId },
        data: { status: 'EXPIRED', respondedAt: new Date() },
      });
      throw new Error('Invitation has expired');
    }

    if (accept) {
      await prisma.$transaction(async (tx) => {
        await tx.binomeInvitation.update({
          where: { id: invitationId },
          data: { status: 'ACCEPTED', respondedAt: new Date() },
        });

        // Application is now fully active — visible to admin
        await tx.studentApplication.update({
          where: { id: invitation.studentApplicationId },
          data: { status: 'PENDING' },
        });

        await AuditService.log({
          userId,
          action: 'BINOME_INVITATION_ACCEPTED',
          targetType: 'BinomeInvitation',
          targetId: invitationId,
        });
      });

      await NotificationService.trigger({
        userId: invitation.application.leader.id,
        type: 'BINOME_ACCEPTED',
        title: 'Binôme Invitation Accepted',
        message: `Your partner has accepted your binôme invitation for "${invitation.application.topic.title}". Your application is now active.`,
        relatedId: invitationId,
        relatedType: 'BinomeInvitation',
        link: '/student/topics',
      });
    } else {
      // Declined: reset the application to individual
      await prisma.$transaction(async (tx) => {
        await tx.binomeInvitation.update({
          where: { id: invitationId },
          data: { status: 'DECLINED', respondedAt: new Date() },
        });

        await tx.studentApplication.update({
          where: { id: invitation.studentApplicationId },
          data: { isBinome: false, partnerId: null },
        });

        await AuditService.log({
          userId,
          action: 'BINOME_INVITATION_DECLINED',
          targetType: 'BinomeInvitation',
          targetId: invitationId,
        });
      });

      await NotificationService.trigger({
        userId: invitation.application.leader.id,
        type: 'BINOME_DECLINED',
        title: 'Binôme Invitation Declined',
        message: `Your partner declined your binôme invitation for "${invitation.application.topic.title}". You can invite someone else or switch to an individual application.`,
        relatedId: invitationId,
        relatedType: 'BinomeInvitation',
        link: '/student/topics',
      });
    }
  }

  // ─── Expire stale invitations (called by cron) ────────────────────────────

  /**
   * Marks PENDING invitations past their expiresAt as EXPIRED.
   * Called daily by the cron job.
   */
  static async expireOldInvitations() {
    const result = await prisma.binomeInvitation.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });

    return result.count;
  }
}
