import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { internshipSchema } from '@/lib/validations/internship.schema';
import { AuditService } from '@/lib/services/audit.service';
import { TeacherLoadService } from '@/lib/services/teacherLoad.service';
import { NotificationService } from '@/lib/services/notification.service';
import { SettingsService } from '@/lib/services/settings.service';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const defaultYear = await SettingsService.getCurrentAcademicYear();
  const academicYear = searchParams.get('academicYear') || defaultYear;
  const internshipType = searchParams.get('internshipType');
  const statusFilter = searchParams.get('status');
  const archivedOnly = searchParams.get('archived') === 'true';
  const showAll = searchParams.get('all') === 'true';
  const role = session.user.role;

  // NFR-SC2: pagination — max 20 records per page by default
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const skip = (page - 1) * limit;

  try {
    const where: Record<string, unknown> = archivedOnly
      ? { archivedAt: { not: null } }
      : { academicYear };

    if (role === 'STUDENT') {
      where.students = { some: { studentId: session.user.id } };
    } else if (role === 'TEACHER') {
      where.teacherId = session.user.id;
    } else if (role === 'COMPANY') {
      where.topic = { proposedById: session.user.id };
    } else if (role === 'ADMIN' && showAll) {
      delete where.academicYear;
    }
    // ADMIN sees all

    if (internshipType) where.internshipType = internshipType;
    if (statusFilter) where.status = statusFilter;

    // NFR-P2: explicit field selection — never fetch unnecessary columns
    const [internships, total] = await Promise.all([
      prisma.internship.findMany({
        where,
        select: {
          id: true,
          status: true,
          academicYear: true,
          internshipType: true,
          startDate: true,
          endDate: true,
          midtermDeadline: true,
          finalDeadline: true,
          archivedAt: true,
          chatArchivedAt: true,
          teacherValidatedFinalReport: true,
          companyValidatedFinalReport: true,
          createdAt: true,
          topic: { select: { title: true, type: true, internshipType: true, companyName: true } },
          teacher: { select: { id: true, name: true, email: true } },
          students: { include: { student: { select: { id: true, name: true, email: true } } } },
          _count: { select: { documents: true, messages: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.internship.count({ where }),
    ]);

    return NextResponse.json({
      data: internships,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to load internships.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { topicId, teacherId, academicYear, studentIds } = internshipSchema.parse(body);

    if (studentIds.length > 2) {
      return NextResponse.json({ error: 'Maximum 2 students per internship.' }, { status: 409 });
    }

    // Enforce teacher capacity before creating
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: teacherId },
      select: { currentLoad: true, maxStudents: true },
    });
    if (!teacherProfile || teacherProfile.currentLoad >= teacherProfile.maxStudents) {
      return NextResponse.json(
        { error: 'This teacher has reached their maximum supervision capacity.' },
        { status: 409 },
      );
    }

    // Fetch topic to inherit internship type
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      select: { internshipType: true },
    });

    // NFR-RDI1: wrap multi-table writes in a transaction
    const internship = await prisma.$transaction(async (tx) => {
      const created = await tx.internship.create({
        data: {
          id: randomUUID(),
          topicId,
          teacherId,
          academicYear,
          internshipType: topic?.internshipType ?? null,
          status: 'REQUESTED',
          updatedAt: new Date(),
          students: {
            create: studentIds.map((sid: string, i: number) => ({
              id: randomUUID(),
              studentId: sid,
              isLeader: i === 0,
            })),
          },
        },
        include: {
          students: { include: { student: { select: { id: true, name: true } } } },
        },
      });

      await tx.topic.update({
        where: { id: topicId },
        data: { status: 'TAKEN' },
      });

      return created;
    });

    // Increment teacher load after successful transaction
    await TeacherLoadService.increment(teacherId);

    // Notify all parties
    const recipientIds = [...internship.students.map((s: { studentId: string }) => s.studentId), teacherId];
    for (const uid of recipientIds) {
      await NotificationService.trigger({
        userId: uid,
        type: 'INTERNSHIP_STARTED',
        title: 'Internship Record Created',
        message:
          'Your internship has been officially created and is awaiting document exchange.',
        relatedId: internship.id,
        relatedType: 'Internship',
        link: '/student/internship',
      });
    }

    await AuditService.log({
      userId: session.user.id,
      action: 'INTERNSHIP_CREATED',
      targetType: 'Internship',
      targetId: internship.id,
      details: { internshipType: topic?.internshipType },
    });

    return NextResponse.json({ data: internship }, { status: 201 });
  } catch (error: unknown) {
    if ((error as { name?: string })?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Please check your input and try again.' },
        { status: 400 },
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: 'Internship could not be created. Please try again.' },
      { status: 500 },
    );
  }
}
