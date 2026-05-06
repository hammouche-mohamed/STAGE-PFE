import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { topicSchema } from '@/lib/validations/topic.schema';
import { AuditService } from '@/lib/services/audit.service';
import { addHours } from 'date-fns';
import { SettingsService } from '@/lib/services/settings.service';
import { isEligibleForType } from '@/types/internship';
import type { StudentLevel, InternshipType } from '@/types/internship';
import { randomUUID } from 'crypto';

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

    const result = await prisma.$transaction(async (tx) => {
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
  const statusFilter = searchParams.get('status');
  const defaultYear = await SettingsService.getCurrentAcademicYear();
  const academicYear = searchParams.get('academicYear') || defaultYear;

  // NFR-SC2: pagination — max 20 records per page
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const skip = (page - 1) * limit;

  // Determine which internship types this user can see
  let allowedInternshipTypes: string[] | undefined;

  if (session.user.role === 'STUDENT') {
    const studentLevel = (session.user as { level?: StudentLevel }).level;
    const normalOnlyLevels: StudentLevel[] = ['L1', 'L2', 'M1'];
    if (studentLevel && normalOnlyLevels.includes(studentLevel)) {
      allowedInternshipTypes = ['NORMAL'];
    }
  }

  try {
    const where: Record<string, unknown> = {
      academicYear,
      ...(typeFilter && { type: typeFilter as never }),
      ...(allowedInternshipTypes
        ? { internshipType: { in: allowedInternshipTypes as never[] } }
        : internshipTypeFilter
        ? { internshipType: internshipTypeFilter as never }
        : {}),
      // Role-specific visibility rules
      ...(session.user.role === 'STUDENT' && { status: 'OPEN_FOR_SELECTION' }),
      ...((session.user.role === 'COMPANY' || session.user.role === 'TEACHER') && {
        proposedById: session.user.id,
      }),
      // Optional status filter for admin
      ...(session.user.role === 'ADMIN' && statusFilter && { status: statusFilter as never }),
    };

    // NFR-P2: explicit field selection
    const [topics, total] = await Promise.all([
      prisma.topic.findMany({
        where,
        select: {
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
          proposedBy: { select: { id: true, name: true } },
          assignedTeacher: { select: { id: true, name: true } },
        },
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

