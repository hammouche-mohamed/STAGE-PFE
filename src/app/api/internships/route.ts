import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { internshipSchema } from '@/lib/validations/internship.schema';
import { AuditService } from '@/lib/services/audit.service';
import { TeacherLoadService } from '@/lib/services/teacherLoad.service';
import { NotificationService } from '@/lib/services/notification.service';
import { SettingsService } from '@/lib/services/settings.service';
import { assertNoActiveInternship } from '@/lib/services/internshipGuard.service';
import { resolveTeamCap } from '@/lib/services/teamSize.service';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const defaultYear = await SettingsService.getCurrentAcademicYear();
  const academicYear = searchParams.get('academicYear') || defaultYear;
  const internshipType = searchParams.get('internshipType');
  const statusFilter = searchParams.get('status');
  const filiereIdFilter = searchParams.get('filiereId');
  const levelFilter = searchParams.get('level');
  const archivedOnly = searchParams.get('archived') === 'true';
  const showAll = searchParams.get('all') === 'true';
  const role = session.user.role;

  // NFR-SC2: pagination — max 20 records per page by default
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const skip = (page - 1) * limit;

  try {
    // If the caller explicitly asks for a finished status, drop the
    // "academicYear OR not-finished" default — otherwise the OR clause
    // contradicts the explicit filter and yields zero rows.
    const explicitFinishedFilter =
      statusFilter === 'COMPLETED' || statusFilter === 'CANCELLED';

    const where: Record<string, any> = archivedOnly
      ? { archivedAt: { not: null } }
      : explicitFinishedFilter
        ? { academicYear }
        : {
            OR: [
              { academicYear },
              { NOT: { status: { in: ['COMPLETED', 'CANCELLED'] } } }
            ]
          };

    // Helper to merge topic-side filters without overwriting role scoping.
    const topicWhere: Record<string, any> = {};

    if (role === 'STUDENT') {
      where.internshipstudent = { some: { studentId: session.user.id } };
    } else if (role === 'TEACHER') {
      where.teacherId = session.user.id;
    } else if (role === 'COMPANY') {
      topicWhere.proposedById = session.user.id;
    } else if (role === 'ADMIN') {
      if (showAll && session.user.isSuperAdmin) {
        delete (where as any).OR;
      }
      if (!session.user.isSuperAdmin) {
        if (session.user.filiereId) {
          topicWhere.filiereId = session.user.filiereId;
        } else {
          where.id = "UNASSIGNED_ADMIN_BLOCK";
        }
      } else if (filiereIdFilter && filiereIdFilter !== 'ALL') {
        // Super-admin filtering by department.
        topicWhere.filiereId = filiereIdFilter;
      }
    }

    if (Object.keys(topicWhere).length > 0) {
      where.topic = topicWhere;
    }

    if (internshipType) where.internshipType = internshipType;
    if (statusFilter) where.status = statusFilter;

    // Level filter — match internships that include at least one student
    // at the given level (L1..M2). Filtering on the student-profile relation.
    if (levelFilter && levelFilter !== 'ALL') {
      where.internshipstudent = {
        ...(where.internshipstudent || {}),
        some: {
          ...(where.internshipstudent?.some || {}),
          user: { studentprofile: { is: { level: levelFilter } } },
        },
      };
    }

    // NFR-P2: explicit field selection — use schema field names (Vercel regenerates Prisma Client from schema)
    // Schema: user (not teacher), internshipstudent (not students), document/message (not documents/messages)
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
          technicalSupervisorName: true,
          technicalSupervisorEmail: true,
          archivedAt: true,
          chatArchivedAt: true,
          teacherValidatedFinalReport: true,
          companyValidatedFinalReport: true,
          createdAt: true,
          topic: {
            select: {
              title: true, type: true, internshipType: true,
              companyName: true, description: true,
              targetLevels: true,
              filiereId: true,
              filiere: { select: { id: true, name: true, code: true } },
            },
          },
          user: { select: { id: true, name: true, email: true } },
          internshipstudent: {
            select: {
              id: true,
              studentId: true,
              isLeader: true,
              user: {
                select: {
                  id: true, name: true, email: true,
                  studentprofile: { select: { level: true, studentId: true } },
                },
              },
            },
          },
          _count: { select: { document: true, message: true } },
        } as any,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.internship.count({ where }),
    ]);

    // Map schema field names back to friendly names expected by the client
    const mappedInternships = (internships as any[]).map(i => ({
      ...i,
      teacher: i.user || { id: '', name: 'Unknown', email: '' },
      students: (i.internshipstudent || []).map((s: any) => ({
        ...s,
        student: {
          ...s.user,
          level: s.user?.studentprofile?.level ?? null,
          studentNumber: s.user?.studentprofile?.studentId ?? null,
        },
      })),
      _count: {
        documents: i._count?.document ?? 0,
        messages: i._count?.message ?? 0,
      },
      // Clean up raw schema fields
      user: undefined,
      internshipstudent: undefined,
    }));

    // Stitch in teacher departments manually to bypass missing schema relations
    const teacherIds = [...new Set(mappedInternships.filter(i => i.teacher?.id).map(i => i.teacher.id))];
    const [teacherProfiles, allFilieres] = await Promise.all([
      teacherIds.length > 0 ? prisma.teacherProfile.findMany({ where: { userId: { in: teacherIds } } }) : Promise.resolve([]),
      prisma.filiere.findMany({ select: { id: true, name: true } })
    ]);

    const stitchedInternships = mappedInternships.map(i => {
      if (!i.teacher?.id) return { ...i, teacher: { id: '', name: 'Unknown', email: '', filiereName: 'N/A' } };
      const prof = teacherProfiles.find(p => p.userId === i.teacher.id);
      const filiere = prof ? allFilieres.find(f => f.id === prof.filiereId) : null;
      return {
        ...i,
        teacher: {
          ...i.teacher,
          filiereName: filiere?.name || "No Dept"
        }
      };
    });

    return NextResponse.json({
      data: stitchedInternships,
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

    // Dept Admin Scoping Check
    if (!session.user.isSuperAdmin && session.user.filiereId) {
      const topic = await prisma.topic.findUnique({ where: { id: topicId }, select: { filiereId: true } });
      if (topic && topic.filiereId && topic.filiereId !== session.user.filiereId) {
        return NextResponse.json({ error: "Forbidden: Topic belongs to another department" }, { status: 403 });
      }
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

    // Fetch topic to inherit internship type + validate completeness
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      select: {
        internshipType: true,
        type: true,
        maxStudents: true,
        title: true,
        description: true,
        requiredSkills: true,
        filiereId: true,
        targetLevels: true,
        assignedTeacherId: true,
        proposedByStudent: true,
      },
    });

    if (!topic) {
      return NextResponse.json({ error: 'Topic not found.' }, { status: 404 });
    }

    // An internship cannot start until the topic is fully specified and a
    // supervisor is assigned. Block here with a clear list of what's missing.
    const missing: string[] = [];
    if (!topic.title?.trim()) missing.push('title');
    if (!topic.description?.trim()) missing.push('description');
    if (!topic.requiredSkills?.trim()) missing.push('required skills');
    if (!topic.filiereId) missing.push('department');
    // Student-proposed topics don't carry target levels (the student is the
    // target), so only require it for the others.
    if (!topic.proposedByStudent && !topic.targetLevels?.trim())
      missing.push('target level(s)');
    const hasSupervisor = !!teacherId || !!topic.assignedTeacherId;
    if (!hasSupervisor) missing.push('supervisor (assigned teacher)');

    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot start the internship — this topic is incomplete. Missing: ${missing.join(', ')}. Complete the topic and assign a supervisor first.`,
        },
        { status: 400 },
      );
    }

    // Team-size cap by topic type: company-set max, PFE Super-Admin limit
    // (the smaller wins), or unlimited for student-proposed NORMAL.
    const teamCap = await resolveTeamCap(topic as any);
    if (teamCap !== null && studentIds.length > teamCap) {
      const kind = topic.type === 'COMPANY_PROPOSED' ? 'the company' : 'the PFE policy';
      return NextResponse.json(
        {
          error: `This topic allows at most ${teamCap} student(s) (set by ${kind}). You selected ${studentIds.length}.`,
        },
        { status: 409 },
      );
    }

    // NFR-RDI1: wrap multi-table writes in a transaction
    const internship = await prisma.$transaction(async (tx) => {
      // NFR-RDI3: prevent the same student from holding two active
      // internships in the same academic year.
      await assertNoActiveInternship(tx, studentIds, academicYear);

      const created = await tx.internship.create({
        data: {
          id: randomUUID(),
          topicId,
          teacherId,
          academicYear,
          internshipType: topic?.internshipType ?? null,
          status: 'REQUESTED',
          updatedAt: new Date(),
          internshipstudent: {
            create: studentIds.map((sid: string, i: number) => ({
              id: randomUUID(),
              studentId: sid,
              isLeader: i === 0,
            })),
          },
        } as any,
        include: {
          internshipstudent: { include: { user: { select: { id: true, name: true } } } },
        } as any,
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
    const students = (internship as any).internshipstudent.map((s: { studentId: string }) => s.studentId);
    
    // Notify students
    if (students.length > 0) {
      await (prisma as any).notification.createMany({
        data: students.map((uid: string) => ({
          id: randomUUID(),
          userId: uid,
          type: 'INTERNSHIP_STARTED',
          title: 'Internship Record Created',
          message: 'Your internship has been officially created and is awaiting document exchange.',
          relatedId: internship.id,
          relatedType: 'Internship',
          link: '/student/internship',
        }))
      });
    }

    // Notify teacher
    await NotificationService.trigger({
      userId: teacherId,
      type: 'INTERNSHIP_STARTED',
      title: 'New Supervision Assigned',
      message: `You have been assigned as the supervisor for the project: ${topic?.title || 'New Internship'}.`,
      relatedId: internship.id,
      relatedType: 'Internship',
      link: `/teacher/internships/${internship.id}`,
    });

    // Notify Super Admins if a Department Admin created the internship
    if (!session.user.isSuperAdmin) {
      const superAdmins = await prisma.user.findMany({
        where: { adminprofile: { isSuperAdmin: true } },
        select: { id: true }
      } as any);

      if (superAdmins.length > 0) {
        await prisma.notification.createMany({
          data: superAdmins.map(sa => ({
            id: randomUUID(),
            userId: sa.id,
            type: "INTERNSHIP_STARTED",
            title: "New Team Created by Department Admin",
            message: `Admin ${session.user.name} has created a new internship team for topic ID: ${topicId}.`,
            relatedId: internship.id,
            relatedType: "Internship",
            link: `/admin/internships`
          }))
        });
      }
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
    // NFR-RDI3 conflict: surface the friendly message from assertNoActiveInternship.
    const message = error instanceof Error ? error.message : '';
    if (message.includes('one active internship per academic year')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json(
      { error: 'Internship could not be created. Please try again.' },
      { status: 500 },
    );
  }
}
