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

// NFR-P2: cache academic year for 1 minute
let cachedYear: { year: string; expiry: number } | null = null;
const YEAR_CACHE_TTL = 60 * 1000;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only Students and Companies can propose topics
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

    // Enforce internship type eligibility for students
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
      // 1. Create Topic
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
          updatedAt: new Date(),
        },
      });

      // 2. Handle Binôme if applicable
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

      // 3. Create initial admin validation step
      await tx.validation.create({
        data: {
          id: randomUUID(),
          topicId: topic.id,
          validatorId: 'SYSTEM',
          step: 'ADMIN',
          status: 'PENDING',
        },
      });

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
            { adminProfile: { isSuperAdmin: true } },
            { adminProfile: { filiereId: validatedData.filiereId } }
          ]
        } : {})
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

  // NFR-SC2: pagination — max 20 records per page
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const skip = (page - 1) * limit;

  // Determine which internship types this user can see
  let allowedInternshipTypes: string[] | undefined;

  const where: Record<string, any> = {};

  try {
    // Get IDs of topics that are linked to COMPLETED or CANCELLED internships
    try {
      const completedInternships = await prisma.internship.findMany({
        where: { status: { in: ['COMPLETED', 'CANCELLED'] } },
        select: { topicId: true }
      });
      const completedTopicIds = completedInternships.map(i => i.topicId);
      if (completedTopicIds.length > 0) {
        where.id = { notIn: completedTopicIds };
      }
    } catch {
      // Non-critical — show all topics if this fails
    }

    // ── ACADEMIC YEAR FILTER ────────────────────────────────────────────────
    // Admins see all years by default unless specified.
    // Students/Teachers are locked to the current year by default.
    if (academicYear && academicYear !== 'all') {
      where.academicYear = academicYear;
    } else if (session.user.role !== 'ADMIN') {
      const currentYear = await SettingsService.getCurrentAcademicYear();
      if (currentYear) where.academicYear = currentYear;
    }

    // ── ROLE-BASED VISIBILITY & FILTERS ────────────────────────────────────
    if (session.user.role === 'ADMIN') {
      // Admins see topics in their department (or all if super admin or unassigned)
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
      // Students see topics open for selection OR their own proposals (even if pending)
      where.OR = [
        { status: 'OPEN_FOR_SELECTION' },
        { proposedById: session.user.id }
      ];

      if (filiereFilter && filiereFilter !== 'ALL') {
        where.filiereId = filiereFilter;
      }

      const studentLevel = (session.user as { level?: StudentLevel }).level;
      const normalOnlyLevels: StudentLevel[] = ['L1', 'L2', 'M1'];
      if (studentLevel && normalOnlyLevels.includes(studentLevel)) {
        allowedInternshipTypes = ['NORMAL'];
      }

    } else if (session.user.role === 'TEACHER') {
      // Teachers see assigned topics, their applications, or approved unassigned topics
      where.OR = [
        { assignedTeacherId: session.user.id },
        { teacherApplications: { some: { teacherId: session.user.id } } },
        { 
          AND: [
            { status: 'APPROVED' },
            { assignedTeacherId: null },
            session.user.filiereId ? { filiereId: session.user.filiereId } : {},
          ]
        }
      ];
      if (filiereFilter && filiereFilter !== 'ALL') {
        where.filiereId = filiereFilter;
      }

    } else if (session.user.role === 'COMPANY') {
      where.proposedById = session.user.id;
    }

    // Apply internship type restriction if applicable
    if (allowedInternshipTypes) {
      where.internshipType = { in: allowedInternshipTypes };
    } else if (internshipTypeFilter && internshipTypeFilter !== 'ALL') {
      where.internshipType = internshipTypeFilter;
    }

    if (typeFilter && typeFilter !== 'ALL') {
      where.type = typeFilter;
    }

    // NFR-P2: explicit field selection
    // Build select dynamically to avoid passing `false` for relation fields (Prisma runtime error)
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
      pendingEditData: true,
      pendingEditRequestedAt: true,
      proposedBy: { select: { id: true, name: true } },
      assignedTeacher: { select: { id: true, name: true } },
    };

    const topicSelect = session.user.role === 'TEACHER'
      ? {
          ...baseSelect,
          teacherApplications: {
            where: { teacherId: session.user.id },
            select: { id: true, status: true },
          },
        }
      : baseSelect;

    const [topics, total] = await Promise.all([
      prisma.topic.findMany({
        where,
        select: topicSelect,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.topic.count({ where }),
    ]);

    return NextResponse.json({
      data: topics,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to load topics.' }, { status: 500 });
  }
}

