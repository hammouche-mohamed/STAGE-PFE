import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NotificationService } from '@/lib/services/notification.service';
import { AuditService } from '@/lib/services/audit.service';
import { randomUUID } from 'crypto';

// PATCH /api/applications/[id]  — Accept or Reject an application
// Accessible by ADMIN or COMPANY (topic owner)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session || !['ADMIN', 'COMPANY'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { action } = await req.json(); // 'ACCEPT' | 'REJECT'

  if (!['ACCEPT', 'REJECT'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  try {
    const application = await prisma.studentApplication.findUnique({
      where: { id },
      include: {
        topic: {
          select: {
            id: true,
            title: true,
            maxStudents: true,
            proposedById: true,
            internshipType: true,
          },
        },
        leader: { select: { id: true, name: true } },
      },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Company can only act on their own topics
    if (
      session.user.role === 'COMPANY' &&
      application.topic.proposedById !== session.user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'REJECT') {
      await prisma.studentApplication.update({
        where: { id },
        data: { status: 'REJECTED', reviewedAt: new Date() },
      });

      await NotificationService.trigger({
        userId: application.leaderId,
        type: 'APPLICATION_REJECTED',
        title: 'Application Not Selected',
        message: `Your application for "${application.topic.title}" was not selected.`,
        relatedId: application.topicId,
        relatedType: 'Topic',
        link: '/student/topics',
      });

      return NextResponse.json({ message: 'Application rejected.' });
    }

    // ── ACCEPT ──
    // Check current accepted count against maxStudents
    const acceptedCount = await prisma.studentApplication.count({
      where: { topicId: application.topicId, status: 'ACCEPTED' },
    });

    if (acceptedCount >= application.topic.maxStudents) {
      return NextResponse.json(
        { error: 'Topic has reached its maximum student capacity.' },
        { status: 409 },
      );
    }

    await prisma.studentApplication.update({
      where: { id },
      data: { status: 'ACCEPTED', reviewedAt: new Date() },
    });

    // Notify the student
    await NotificationService.trigger({
      userId: application.leaderId,
      type: 'APPLICATION_APPROVED',
      title: 'Application Accepted! 🎉',
      message: `Congratulations! Your application for "${application.topic.title}" has been accepted.`,
      relatedId: application.topicId,
      relatedType: 'Topic',
      link: '/student/internship',
    });

    // Check if topic is now full — notify proposer
    const newAcceptedCount = acceptedCount + 1;
    if (newAcceptedCount >= application.topic.maxStudents) {
      // Mark topic as TAKEN
      await prisma.topic.update({
        where: { id: application.topicId },
        data: { status: 'TAKEN' },
      });

      // Notify the topic proposer (company or teacher)
      await NotificationService.trigger({
        userId: application.topic.proposedById,
        type: 'TOPIC_PUBLISHED',
        title: 'Topic is Now Full',
        message: `Your topic "${application.topic.title}" has reached its maximum capacity (${application.topic.maxStudents} student${application.topic.maxStudents > 1 ? 's' : ''}). No more applications will be accepted.`,
        relatedId: application.topicId,
        relatedType: 'Topic',
        link: '/company/topics',
      });

      // Reject all other pending applications for this topic
      const pendingOthers = await prisma.studentApplication.findMany({
        where: { topicId: application.topicId, status: 'PENDING', id: { not: id } },
        select: { id: true, leaderId: true },
      });

      for (const other of pendingOthers) {
        await prisma.studentApplication.update({
          where: { id: other.id },
          data: { status: 'REJECTED', reviewedAt: new Date() },
        });
        await NotificationService.trigger({
          userId: other.leaderId,
          type: 'APPLICATION_REJECTED',
          title: 'Topic No Longer Available',
          message: `The topic "${application.topic.title}" has been filled by another student.`,
          relatedId: application.topicId,
          relatedType: 'Topic',
          link: '/student/topics',
        });
      }
    }

    await AuditService.log({
      userId: session.user.id,
      action: 'APPLICATION_ACCEPTED',
      targetType: 'StudentApplication',
      targetId: id,
      details: { topic: application.topic.title, student: application.leader.name },
    });

    return NextResponse.json({ message: 'Application accepted.' });
  } catch (error) {
    console.error('[applications/[id] PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
