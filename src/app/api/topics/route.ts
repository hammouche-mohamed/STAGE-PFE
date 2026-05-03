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

  // Students, Teachers and Companies can propose topics
  if (session.user.role === 'ADMIN') {
    return NextResponse.json(
      { error: 'Admins manage topics, they do not propose them' },
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
  const typeFilter = searchParams.get('type'); // topic_type: STUDENT_PROPOSED | COMPANY_PROPOSED
  const internshipTypeFilter = searchParams.get('internshipType'); // PFE | NORMAL
  const defaultYear = await SettingsService.getCurrentAcademicYear();
  const academicYear = searchParams.get('academicYear') || defaultYear;

  // Determine which internship types this user can see
  let allowedInternshipTypes: string[] | undefined;

  if (session.user.role === 'STUDENT') {
    const studentLevel = (session.user as any).level as StudentLevel | undefined;
    // L1/L2/M1 can only see NORMAL topics; L3/M2 see both
    const normalOnlyLevels: StudentLevel[] = ['L1', 'L2', 'M1'];
    if (studentLevel && normalOnlyLevels.includes(studentLevel)) {
      allowedInternshipTypes = ['NORMAL'];
    }
  }

  try {
    const topics = await prisma.topic.findMany({
      where: {
        academicYear,
        ...(typeFilter && { type: typeFilter as any }),
        // Apply internship type filter (from query param or level restriction)
        ...(allowedInternshipTypes
          ? { internshipType: { in: allowedInternshipTypes as any[] } }
          : internshipTypeFilter
          ? { internshipType: internshipTypeFilter as any }
          : {}),
        // Students see only published topics; companies see only their own
        ...(session.user.role === 'STUDENT' && { status: 'OPEN_FOR_SELECTION' }),
        ...((session.user.role === 'COMPANY' || session.user.role === 'TEACHER') && { proposedById: session.user.id }),
      },
      include: {
        proposedBy: { select: { name: true } },
        assignedTeacher: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: topics });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}
