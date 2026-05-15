import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NotificationService } from '@/lib/services/notification.service';
import { AuditService } from '@/lib/services/audit.service';
import { addDays, differenceInDays } from 'date-fns';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const internship = await prisma.internship.findUnique({
      where: { id },
      include: {
        topic: {
          select: {
            title: true,
            description: true,
            companyName: true,
            type: true,
            internshipType: true,
            targetLevels: true,
            requiredSkills: true,
            filiereId: true,
            filiere: { select: { id: true, name: true, code: true } },
            proposedBy: { select: { name: true, email: true, role: true } },
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            teacherprofile: {
              select: {
                grade: true,
                speciality: true,
                filiere: { select: { name: true } },
              },
            },
          }
        },
        internshipstudent: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                studentprofile: {
                  select: {
                    level: true,
                    studentId: true,
                    promotion: true,
                    filiere: { select: { name: true } },
                  },
                },
              }
            }
          }
        }
      }
    } as any);

    if (!internship) {
      return NextResponse.json({ error: 'Internship not found' }, { status: 404 });
    }

    // Map schema field names back to friendly names expected by the client
    const teacherUser = (internship as any).user;
    const mapped = {
      ...internship,
      teacher: teacherUser
        ? {
            ...teacherUser,
            grade: teacherUser.teacherprofile?.grade ?? null,
            speciality: teacherUser.teacherprofile?.speciality ?? null,
            filiereName: teacherUser.teacherprofile?.filiere?.name ?? null,
          }
        : null,
      students: ((internship as any).internshipstudent || []).map((s: any) => ({
        ...s,
        student: {
          ...s.user,
          level: s.user?.studentprofile?.level ?? null,
          studentNumber: s.user?.studentprofile?.studentId ?? null,
          promotion: s.user?.studentprofile?.promotion ?? null,
          filiereName: s.user?.studentprofile?.filiere?.name ?? null,
        },
      })),
    };

    return NextResponse.json({ data: mapped });
  } catch (error) {
    console.error('Fetch internship detail failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/internships/[id]
 * Admin sets the finalDeadline.
 * - For PFE: endDate is auto-synced to finalDeadline, midtermDeadline is recalculated.
 * - For NORMAL: only finalDeadline is updated (company already set endDate).
 * Notifies students and company.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { finalDeadline } = body;

    if (!finalDeadline) {
      return NextResponse.json({ error: 'finalDeadline is required' }, { status: 400 });
    }

    const internship = await prisma.internship.findUnique({
      where: { id },
      include: {
        internshipstudent: { select: { studentId: true } },
        topic: { select: { proposedById: true, type: true } },
      } as any,
    });

    if (!internship) return NextResponse.json({ error: 'Internship not found' }, { status: 404 });
    if (!internship.startDate) {
      return NextResponse.json({ error: 'Cannot set deadline before internship has a start date.' }, { status: 400 });
    }

    const deadline = new Date(finalDeadline);
    const isPFE = internship.internshipType === 'PFE';

    // For PFE: endDate = finalDeadline, recalculate midterm
    const newEndDate = isPFE ? deadline : internship.endDate;
    const durationDays = newEndDate ? differenceInDays(newEndDate, internship.startDate) : 0;
    const newMidterm = isPFE && newEndDate
      ? addDays(internship.startDate, Math.floor(durationDays / 2))
      : internship.midtermDeadline;

    const updated = await prisma.internship.update({
      where: { id },
      data: {
        finalDeadline: deadline,
        ...(isPFE && { endDate: deadline, midtermDeadline: newMidterm }),
        updatedAt: new Date(),
      },
    });

    await AuditService.log({
      userId: session.user.id,
      action: 'INTERNSHIP_DEADLINE_SET',
      targetType: 'Internship',
      targetId: id,
      details: { finalDeadline, isPFE, newEndDate, newMidterm },
    });

    // Notify students
    for (const { studentId } of (internship as any).internshipstudent || []) {
      await NotificationService.trigger({
        userId: studentId,
        type: 'DEADLINE_REMINDER',
        title: 'Final Report Deadline Set',
        message: isPFE
          ? `Your PFE final report deadline is ${deadline.toLocaleDateString()}. Your internship end date has been updated accordingly.`
          : `Your final report deadline has been set to ${deadline.toLocaleDateString()}.`,
        relatedId: id,
        relatedType: 'Internship',
        link: '/student/internship',
      });
    }

    // Notify company
    if ((internship as any).topic.proposedById) {
      await NotificationService.trigger({
        userId: (internship as any).topic.proposedById,
        type: 'DEADLINE_REMINDER',
        title: isPFE ? 'PFE End Date Updated' : 'Final Report Deadline Set',
        message: isPFE
          ? `The administration has set the PFE final report deadline to ${deadline.toLocaleDateString()}. The internship end date is now synced to this date.`
          : `The administration has set the final report deadline to ${deadline.toLocaleDateString()}.`,
        relatedId: id,
        relatedType: 'Internship',
        link: '/company/internships',
      });
    }

    return NextResponse.json({
      data: updated,
      message: isPFE
        ? 'Final deadline set and internship end date synced.'
        : 'Final deadline set.',
    });
  } catch (error) {
    console.error('[internship PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
