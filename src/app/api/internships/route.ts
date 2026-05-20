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

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const skip = (page - 1) * limit;

  try {
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

        topicWhere.filiereId = filiereIdFilter;
      }
    }

    if (Object.keys(topicWhere).length > 0) {
      where.topic = topicWhere;
    }

    if (internshipType) where.internshipType = internshipType;
    if (statusFilter) where.status = statusFilter;

    if (levelFilter && levelFilter !== 'ALL') {
      where.internshipstudent = {
        ...(where.internshipstudent || {}),
        some: {
          ...(where.internshipstudent?.some || {}),
          user: { studentprofile: { is: { level: levelFilter } } },
        },
      };
    }

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

    // Per-internship count of documents still awaiting validation (UPLOADED is
    // the status that exposes the Approve/Reject actions). Used by the UI to
    // flag which internships need attention.
    const pendingDocGroups = internships.length
      ? await prisma.document.groupBy({
          by: ['internshipId'],
          where: {
            internshipId: { in: (internships as any[]).map(i => i.id) },
            status: 'UPLOADED',
          },
          _count: { _all: true },
        })
      : [];
    const pendingDocMap = new Map<string, number>(
      pendingDocGroups.map(g => [g.internshipId, g._count._all]),
    );

    const mappedInternships = (internships as any[]).map(i => ({
      ...i,
      pendingDocuments: pendingDocMap.get(i.id) ?? 0,
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
      user: undefined,
      internshipstudent: undefined,
    }));

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

    if (!session.user.isSuperAdmin && session.user.filiereId) {
      const topic = await prisma.topic.findUnique({ where: { id: topicId }, select: { filiereId: true } });
      if (topic && topic.filiereId && topic.filiereId !== session.user.filiereId) {
        return NextResponse.json({ error: "Forbidden: Topic belongs to another department" }, { status: 403 });
      }
    }

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
        proposedById: true,
      },
    });

    if (!topic) {
      return NextResponse.json({ error: 'Topic not found.' }, { status: 404 });
    }

    const missing: string[] = [];
    if (!topic.title?.trim()) missing.push('title');
    if (!topic.description?.trim()) missing.push('description');
    if (!topic.requiredSkills?.trim()) missing.push('required skills');
    if (!topic.filiereId) missing.push('department');
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

    const internship = await prisma.$transaction(async (tx) => {
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

    await TeacherLoadService.increment(teacherId);

    const students = (internship as any).internshipstudent.map((s: { studentId: string }) => s.studentId);

    const topicTitle = topic?.title || 'your topic';

    // Notify every student on the team — in-app + email (so a solo student or
    // each binôme member gets both). createMany would skip the email entirely.
    await Promise.all(
      students.map((uid: string) =>
        NotificationService.trigger({
          userId: uid,
          type: 'INTERNSHIP_STARTED',
          title: 'Internship Started',
          message: `Your internship for "${topicTitle}" has officially started. You can now follow it from your dashboard.`,
          relatedId: internship.id,
          relatedType: 'Internship',
          link: '/student/internship',
        }).catch(() => null),
      ),
    );

    // Supervisor — in-app + email.
    await NotificationService.trigger({
      userId: teacherId,
      type: 'INTERNSHIP_STARTED',
      title: 'Internship Started',
      message: `The internship you are supervising — "${topicTitle}" — has officially started.`,
      relatedId: internship.id,
      relatedType: 'Internship',
      link: `/teacher/internships/${internship.id}`,
    });

    // Host company / proposer — in-app + email. Skipped for student-proposed
    // topics, where the proposer is one of the students already notified above.
    if (topic?.proposedById && !topic.proposedByStudent) {
      await NotificationService.trigger({
        userId: topic.proposedById,
        type: 'INTERNSHIP_STARTED',
        title: 'Internship Started',
        message: `The internship for your topic "${topicTitle}" has officially started. The supervisor and student team are set; you can follow it from your portal.`,
        relatedId: internship.id,
        relatedType: 'Internship',
        link: `/company/internships/${internship.id}`,
      }).catch(() => null);
    }

    // Notify every relevant admin (super admins + the topic's department admin)
    // about the new internship — in-app + email. Excludes the creator so they
    // don't get pinged about their own action. Uses NotificationService.trigger
    // (not createMany) because createMany skips the email path entirely.
    const adminsToNotify = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        id: { not: session.user.id },
        adminprofile: {
          OR: [
            { isSuperAdmin: true },
            ...(topic?.filiereId ? [{ filiereId: topic.filiereId }] : []),
          ],
        },
      },
      select: { id: true },
    } as any);

    await Promise.all(
      adminsToNotify.map((a: { id: string }) =>
        NotificationService.trigger({
          userId: a.id,
          type: 'INTERNSHIP_STARTED',
          title: 'New Internship Started',
          message: `${session.user.name} has created a new internship team for "${topicTitle}". The supervisor, students${topic?.proposedById && !topic.proposedByStudent ? ', and host company' : ''} can now coordinate via the messages hub.`,
          relatedId: internship.id,
          relatedType: 'Internship',
          link: '/admin/internships',
        }).catch(() => null),
      ),
    );

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
      // Surface the offending field(s) so the admin can tell what's wrong
      // instead of seeing a useless "Please check your input" message. The
      // previous version hid every validation failure behind that string.
      const issues = (error as any)?.issues as
        | Array<{ path?: (string | number)[]; message?: string }>
        | undefined;
      const detail = issues?.length
        ? issues
            .map((i) => `${(i.path ?? []).join('.') || 'input'}: ${i.message}`)
            .join('; ')
        : 'invalid request body';
      return NextResponse.json(
        { error: `Validation failed — ${detail}` },
        { status: 400 },
      );
    }
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
