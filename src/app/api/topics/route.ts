import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { topicSchema } from '@/lib/validations/topic.schema';
import { AuditService } from '@/lib/services/audit.service';
import { NotificationService } from '@/lib/services/notification.service';
import { addHours } from 'date-fns';
import { SettingsService } from '@/lib/services/settings.service';
import { isEligibleForType } from '@/types/internship';
import type { StudentLevel, InternshipType } from '@/types/internship';
import { randomUUID } from 'crypto';

let cachedYear: { year: string; expiry: number } | null = null;
const YEAR_CACHE_TTL = 60 * 1000;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role === 'ADMIN' || session.user.role === 'TEACHER') {
    const errorMsg = session.user.role === 'ADMIN'
      ? 'Admins manage topics, they do not propose them'
      : 'Teachers are not authorized to propose topics';
    return NextResponse.json(
      { error: errorMsg },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();
    const validatedData = topicSchema.parse(body);

    if (session.user.role === 'STUDENT' && validatedData.internshipType) {
      const studentLevel = (session.user as any).level as StudentLevel | undefined;
      if (!isEligibleForType(studentLevel, validatedData.internshipType as InternshipType)) {
        return NextResponse.json(
          { error: `Students at level ${studentLevel} can only propose NORMAL internships` },
          { status: 403 },
        );
      }
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const isStudent = session.user.role === 'STUDENT';
      const studentLevel = (session.user as any).level;

      const topic = await tx.topic.create({
        data: {
          id: randomUUID(),
          title: validatedData.title,
          description: validatedData.description,
          requiredSkills: validatedData.requiredSkills,
          type: validatedData.type,
          internshipType: validatedData.internshipType as any,
          maxStudents: validatedData.maxStudents,
          academicYear: validatedData.academicYear,
          proposedById: session.user.id,
          filiereId: validatedData.filiereId,
          assignedTeacherId: validatedData.assignedTeacherId,
          status: 'PENDING_ADMIN',
          proposedByStudent: isStudent,
          targetLevels: isStudent ? studentLevel : (validatedData.targetLevels || 'L1,L2,L3,M1,M2'),
          updatedAt: new Date(),
        },
      });

      if (validatedData.maxStudents === 2 && validatedData.partnerId) {
        const partner = await tx.studentProfile.findUnique({
          where: { studentId: validatedData.partnerId },
          include: { user: true },
        });

        if (!partner) throw new Error('Partner student not found');

        const application = await tx.studentApplication.create({
          data: {
            id: randomUUID(),
            topicId: topic.id,
            leaderId: session.user.id,
            partnerId: partner.userId,
            isBinome: true,
            status: 'PENDING',
          },
        });

        await tx.binomeInvitation.create({
          data: {
            id: randomUUID(),
            studentApplicationId: application.id,
            invitedStudentId: partner.userId,
            expiresAt: addHours(new Date(), 48),
          },
        });
      }

      return topic;
    });

    await AuditService.log({
      userId: session.user.id,
      action: 'TOPIC_SUBMITTED',
      targetType: 'Topic',
      targetId: result.id,
      details: { internshipType: validatedData.internshipType },
    });

    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        ...(validatedData.filiereId ? {
          OR: [
            { adminprofile: { isSuperAdmin: true } },
            { adminprofile: { filiereId: validatedData.filiereId } }
          ]
        } : {} as any)
      },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(admin => ({
          id: randomUUID(),
          userId: admin.id,
          type: 'TOPIC_SUBMITTED',
          title: 'New Topic Proposal',
          message: `${session.user.name} (${session.user.role}) has proposed a new topic: "${validatedData.title}". Please review it.`,
          relatedId: result.id,
          relatedType: 'Topic',
          link: '/admin/topics',
        }))
      });
    }

    return NextResponse.json(
      { message: 'Topic proposal submitted successfully.', data: result },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error('Topic submission failed:', error);
    if ((error as any)?.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: (error as any).errors }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const typeFilter = searchParams.get('type');
  const internshipTypeFilter = searchParams.get('internshipType');
  const filiereFilter = searchParams.get('filiereId');
  const statusFilter = searchParams.get('status');

  let academicYear = searchParams.get('academicYear');
  if (!academicYear) {
    if (cachedYear && cachedYear.expiry > Date.now()) {
      academicYear = cachedYear.year;
    } else {
      academicYear = await SettingsService.getCurrentAcademicYear();
      cachedYear = { year: academicYear, expiry: Date.now() + YEAR_CACHE_TTL };
    }
  }

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const skip = (page - 1) * limit;
  let allowedInternshipTypes: string[] | undefined;

  const where: Record<string, any> = {};

  // Companies keep visibility of their own deleted (archived) topics so they
  // can review them and the reason they were removed. Every other role only
  // ever sees active topics.
  if (session.user.role !== 'COMPANY') {
    where.archivedAt = null;
  }

  try {
    try {
      // Hide topics tied to a FINISHED internship. CANCELLED is intentionally
      // excluded from this filter: a cancelled internship means the topic is
      // available again — keeping it filtered makes the topic vanish from
      // every role (marketplace, students, supervisors) forever, which is
      // what was producing empty "Topics" tabs after a test cancellation.
      const completedInternships = await prisma.internship.findMany({
        where: { status: 'COMPLETED' },
        select: { topicId: true }
      });
      const completedTopicIds = completedInternships.map(i => i.topicId);
      if (completedTopicIds.length > 0) {
        where.id = { notIn: completedTopicIds };
      }
    } catch {
    }
    if (academicYear && academicYear !== 'all' && academicYear !== 'N/A') {
      where.academicYear = academicYear;
    } else if (session.user.role !== 'ADMIN') {
      const currentYear = await SettingsService.getCurrentAcademicYear();
      if (currentYear && currentYear !== 'N/A') where.academicYear = currentYear;
    }

    // Hide stale rejected topics from past years to declutter student/teacher
    // views. Admins manage topics across every year (the page requests
    // academicYear=all), so this restriction must NOT apply to them — otherwise
    // a rejected topic whose year differs from the configured system year would
    // silently vanish from the admin "Rejected" tab.
    const adminViewingAllYears =
      session.user.role === 'ADMIN' && (!academicYear || academicYear === 'all');
    const systemYear =
      cachedYear && cachedYear.expiry > Date.now()
        ? cachedYear.year
        : await SettingsService.getCurrentAcademicYear();
    if (!adminViewingAllYears && systemYear && systemYear !== 'N/A') {
      where.NOT = { status: 'REJECTED', academicYear: { not: systemYear } };
    }

    if (session.user.role === 'ADMIN') {
      if (session.user.isSuperAdmin) {
        if (filiereFilter && filiereFilter !== 'ALL') {
          where.filiereId = filiereFilter;
        }
      } else if (session.user.filiereId) {
        where.filiereId = session.user.filiereId;
      }

      if (statusFilter && statusFilter !== 'ALL') {
        if (statusFilter === 'MODIFICATIONS') {
          where.pendingEditData = { not: null };
        } else {
          where.status = statusFilter;
        }
      }

      const assigned = searchParams.get('assigned');
      if (assigned === 'true') where.assignedTeacherId = { not: null };
      if (assigned === 'false') where.assignedTeacherId = null;

    } else if (session.user.role === 'STUDENT') {
      // Students see: anything currently open for selection, anything they
      // proposed, AND anything their team already applied to — even after it
      // becomes TAKEN. Without the third clause, the moment the admin creates
      // the internship the topic vanishes from the student's "All" / "Applied"
      // tabs even though the badge still says they have applications.
      where.OR = [
        { status: 'OPEN_FOR_SELECTION' },
        { proposedById: session.user.id },
        {
          studentapplication: {
            some: {
              studentteam: {
                teammember: { some: { studentId: session.user.id } },
              },
            },
          },
        },
      ];

      if (filiereFilter && filiereFilter !== 'ALL') {
        where.filiereId = filiereFilter;
      }

      // NOTE: we intentionally do NOT hide PFE topics from L1/L2/M1 here.
      // Students must be able to SEE every topic in scope (same department)
      // even if they can't apply — the PFE/level eligibility is enforced at
      // application time instead (see /api/applications POST).

    } else if (session.user.role === 'TEACHER') {
      // Marketplace: a topic stays here until a supervisor is officially
      // assigned (i.e., the assigned teacher has accepted). So it shows when:
      //   - status is APPROVED or OPEN_FOR_SELECTION with no supervisor, OR
      //   - status is PENDING_TEACHER (admin picked someone, but they haven't
      //     accepted yet — the topic is not officially taken).
      // We constrain by department ONLY when the teacher actually has one. A
      // teacher whose profile has no filiereId was previously matched against
      // '__no_department__', which matches nothing — silently emptying their
      // marketplace forever even after a decline/cancel that should re-expose
      // the topic. Drop the constraint in that case so they at least see what
      // exists; an admin can fix the profile later.
      // Resolve the teacher's department from the DB if the session lost it
      // (JWT only refetches on `undefined`, not on a cached `null`). Without
      // this, a stale token leaves the teacher with `__no_department__` for
      // life and they never see any marketplace topic.
      let teacherFiliereId =
        (session.user as any).filiereId as string | null | undefined;
      if (!teacherFiliereId) {
        try {
          const profile = await prisma.teacherProfile.findUnique({
            where: { userId: session.user.id },
            select: { filiereId: true },
          });
          teacherFiliereId = profile?.filiereId ?? null;
        } catch {
          teacherFiliereId = null;
        }
      }

      // Marketplace: every topic in this teacher's department that is still
      // up for grabs — i.e. either currently open with no supervisor, OR
      // pending another teacher's response (so it remains visible to the
      // department; the client renders a "Pending another supervisor" badge
      // instead of action buttons). The teacher's OWN pending invitations
      // still come through the first OR clause (`assignedTeacherId === me`).
      const marketAnd: any[] = [
        {
          OR: [
            {
              AND: [
                { status: { in: ['APPROVED', 'OPEN_FOR_SELECTION'] } },
                { assignedTeacherId: null },
              ],
            },
            { status: 'PENDING_TEACHER' },
          ],
        },
      ];
      if (teacherFiliereId) {
        marketAnd.push({ filiereId: teacherFiliereId });
      }

      where.OR = [
        { assignedTeacherId: session.user.id },
        { teacherapplication: { some: { teacherId: session.user.id } } },
        { AND: marketAnd },
      ];
      if (filiereFilter && filiereFilter !== 'ALL') {
        where.filiereId = filiereFilter;
      }

    } else if (session.user.role === 'COMPANY') {
      where.proposedById = session.user.id;
    }

    if (allowedInternshipTypes) {
      where.internshipType = { in: allowedInternshipTypes };
    } else if (internshipTypeFilter && internshipTypeFilter !== 'ALL') {
      where.internshipType = internshipTypeFilter;
    }

    if (typeFilter && typeFilter !== 'ALL') {
      where.type = typeFilter;
    }

    const baseSelect = {
      id: true,
      title: true,
      description: true,
      type: true,
      internshipType: true,
      status: true,
      maxStudents: true,
      academicYear: true,
      proposedById: true,
      assignedTeacherId: true,
      resubmissionCount: true,
      maxResubmissions: true,
      rejectionReason: true,
      createdAt: true,
      updatedAt: true,
      archivedAt: true,
      pendingEditData: true,
      pendingEditRequestedAt: true,
      targetLevels: true,
      filiereId: true,
      requiredSkills: true,
      filiere: { select: { id: true, name: true, code: true } },
      proposedBy: { select: { id: true, name: true } },
      assignedTeacher: { select: { id: true, name: true } },
      _count: {
        select: {
          studentapplication: true,
          // Surface pending teacher supervision requests so the admin list
          // can flag topics where a teacher wants to supervise.
          teacherapplication: { where: { status: 'PENDING' } } as any,
        }
      }
    };

    const topicSelect =
      session.user.role === 'TEACHER'
        ? {
            ...baseSelect,
            teacherapplication: {
              where: { teacherId: session.user.id },
              select: { id: true, status: true },
            },
          }
        : session.user.role === 'COMPANY'
        ? {
            // Only the company view shows the deletion reason for its own
            // archived topics, so request that column only here. Pulled in
            // separately so the rest of the app keeps working before
            // `prisma db push` adds the column to the DB.
            ...baseSelect,
            deletionReason: true,
          }
        : baseSelect;

    const [rawTopics, total, totalTopicsInDb] = await Promise.all([
      prisma.topic.findMany({
        where,
        select: topicSelect as any,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.topic.count({ where }),
      prisma.topic.count(),
    ]);

    // Diagnostic: when nothing matches but there ARE topics in the DB, dump
    // the where clause + the user's filière/year so the cause is visible in
    // the server console instead of silently empty UIs.
    if (total === 0 && totalTopicsInDb > 0) {
      console.warn('[Topics GET] empty result', {
        role: session.user.role,
        userId: session.user.id,
        filiereId: (session.user as any).filiereId ?? null,
        academicYear,
        totalTopicsInDb,
        where: JSON.stringify(where),
      });
    }

    const topics = rawTopics.map((t: any) => ({
      ...t,
      teacherApplications: t.teacherapplication || [],
      pendingTeacherApplicationsCount: t._count?.teacherapplication || 0,
      _count: {
        applications: t._count?.studentapplication || 0,
        pendingTeacherApplications: t._count?.teacherapplication || 0,
      },
    }));


    return NextResponse.json({
      data: topics,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    const message = error?.message || 'Unknown error';
    console.error('[Topics API Error]', message, error?.code, error?.stack?.split('\n')[0]);
    return NextResponse.json({ error: `Failed to load topics: ${message}` }, { status: 500 });
  }
}

