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

    const deadline = new Date(finalDeadline);
    const isPFE = internship.internshipType === 'PFE';

    // PFE is a deliberate exception: the admin's final-report deadline IS the
    // PFE end date, and the company can only activate a PFE internship AFTER
    // that deadline exists — so the admin must be able to set it BEFORE a
    // start date exists (the midterm is (re)computed later, at activation).
    // For NORMAL the company sets the dates first, so a start date is required.
    if (!isPFE && !internship.startDate) {
      return NextResponse.json(
        {
          error:
            'Cannot set the report deadline yet — the company has not started ' +
            'this internship (no start date). The company confirms the start ' +
            'date when it activates the internship.',
        },
        { status: 400 },
      );
    }

    // NORMAL / company internships: the company sets the end date. The final
    // report deadline must fall on or before that date — the admin cannot
    // set a report deadline after the company's agreed end of internship.
    if (!isPFE && internship.endDate && deadline > internship.endDate) {
      return NextResponse.json(
        {
          error:
            `The report deadline cannot be after the company's internship end date ` +
            `(${new Date(internship.endDate).toLocaleDateString()}). ` +
            `Set it on or before that date.`,
        },
        { status: 400 },
      );
    }

    // For PFE: endDate = finalDeadline. The midterm is only (re)computable
    // once a start date exists — if the deadline is set before activation,
    // leave the midterm; activation recalculates the deadlines anyway.
    const newEndDate = isPFE ? deadline : internship.endDate;
    const newMidterm =
      isPFE && newEndDate && internship.startDate
        ? addDays(
            internship.startDate,
            Math.floor(differenceInDays(newEndDate, internship.startDate) / 2),
          )
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
