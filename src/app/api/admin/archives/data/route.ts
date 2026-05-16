import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';



export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year');
  const type = searchParams.get('type') || 'internships';
  const paramFiliereId = searchParams.get('filiereId');
  const internshipTypeFilter = searchParams.get('internshipType'); // PFE | NORMAL

  if (!year || year === 'all') {
    return NextResponse.json({ error: 'Specific academic year required for detailed archives' }, { status: 400 });
  }

  const filiereId = session.user.isSuperAdmin
    ? (paramFiliereId && paramFiliereId !== 'all' ? paramFiliereId : null)
    : session.user.filiereId;


  if (!session.user.isSuperAdmin && !filiereId) {
    return NextResponse.json({ data: [] });
  }
  const FINISHED_STATUSES = ['COMPLETED', 'CANCELLED'];

  try {
    let data: any[] = [];

    switch (type) {

      // ── STUDENTS ────────────────────────────────────────────────────────────
      case 'students':
        data = await prisma.user.findMany({
          where: {
            role: 'STUDENT',
            studentprofile: {
              academicYear: year,
              ...(filiereId && { filiereId }),
            },
          } as any,
          include: {
            studentprofile: { include: { filiere: true } },
            internshipstudent: {
              where: { internship: { academicYear: year } },
              include: { internship: { include: { topic: { select: { title: true } } } } },
            },
          },
          orderBy: { name: 'asc' },
        } as any);
        break;

      // ── TEACHERS ────────────────────────────────────────────────────────────
      case 'teachers':
        data = await prisma.user.findMany({
          where: {
            role: 'TEACHER',
            OR: [
              {
                internship: {
                  some: {
                    academicYear: year,
                    ...(filiereId && { topic: { filiereId } }),
                  },
                },
              },
              {
                assignedTopics: {
                  some: {
                    academicYear: year,
                    ...(filiereId && { filiereId }),
                  },
                },
              },
            ],
          } as any,
          include: {
            teacherprofile: { include: { filiere: true } },
            _count: {
              select: {
                internship: { where: { academicYear: year } },
                proposedTopics: { where: { academicYear: year } },
              },
            },
          },
          orderBy: { name: 'asc' },
        } as any);
        break;

        // ── COMPANIES ───────────────────────────────────────────────────────────
        data = await prisma.user.findMany({
          where: {
            role: 'COMPANY',
            proposedTopics: {
              some: {
                academicYear: year,
                ...(filiereId && { filiereId }),
              },
            },
          } as any,
          include: {
            companyprofile: true,
            _count: {
              select: {
                proposedTopics: { where: { academicYear: year } },
              },
            },
          },
          orderBy: { name: 'asc' },
        } as any);
        break;

      case 'topics':
        data = await prisma.topic.findMany({
          where: {
            academicYear: year,
            ...(filiereId && { filiereId }),
            ...(internshipTypeFilter && internshipTypeFilter !== 'ALL'
              ? { internshipType: internshipTypeFilter as any }
              : {}),
            // A topic belongs in Archives only once its year has actually been
            // archived (the "Archive Year" action stamps archivedAt on the
            // REJECTED and finished-TAKEN topics for that year). Matching on
            // status alone would surface rejected/finished topics of a still
            // active year here AND in the Topics > Rejected tab.
            archivedAt: { not: null },
          } as any,
          include: {
            proposedBy: { select: { name: true, email: true } },
            filiere: true,
            internship: { select: { status: true, completedAt: true } },
            _count: { select: { studentapplication: true } },
          },
          orderBy: { updatedAt: 'desc' },
        } as any);
        break;

      // ── DOCUMENTS ───────────────────────────────────────────────────────────
      case 'documents':
        data = await prisma.document.findMany({
          where: {
            internship: {
              academicYear: year,
              status: { in: FINISHED_STATUSES },
              ...(filiereId && { topic: { filiereId } }),
            },
          } as any,
          include: {
            uploadedBy: { select: { name: true, role: true } },
            internship: { include: { topic: { select: { title: true } } } },
          },
          orderBy: { uploadedAt: 'desc' },
        } as any);
        break;

      // ── AUDIT LOGS ──────────────────────────────────────────────────────────
      case 'audit': {
        const [startYearStr, endYearStr] = year.split('-');
        const startDate = new Date(`${startYearStr}-09-01`);
        const endDate = new Date(`${endYearStr}-08-31T23:59:59`);

        data = await prisma.auditLog.findMany({
          where: {
            createdAt: { gte: startDate, lte: endDate },
            ...(filiereId
              ? {
                user: {
                  OR: [
                    { studentprofile: { filiereId } },
                    { teacherprofile: { filiereId } },
                    { adminprofile: { filiereId } },
                  ],
                },
              }
              : {}),
          } as any,
          include: {
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        } as any);
        break;
      }

      // ── INTERNSHIPS ─────────────────────────────────────────────────────────
      case 'internships':
      default:
        data = await prisma.internship.findMany({
          where: {
            academicYear: year,
            ...(filiereId && { topic: { filiereId } }),
          } as any,
          include: {
            topic: { select: { title: true, internshipType: true } },
            user: { select: { name: true, email: true } },
            internshipstudent: { include: { user: { select: { name: true, email: true } } } },
            _count: { select: { message: true, document: true } },
          },
          orderBy: { completedAt: 'desc' },
        } as any);
        break;
    }

    // ── MAPPING ─────────────────────────────────────────────────────────────
    const mappedData = (data as any[]).map(item => {
      if (type === 'internships') {
        return {
          ...item,
          internshipType: item.internshipType || item.topic?.internshipType || null,
          teacher: item.user || { name: 'Unknown' },
          students: (item.internshipstudent || []).map((s: any) => ({
            ...s,
            student: s.user,
          })),
          _count: {
            messages: item._count?.message || 0,
            documents: item._count?.document || 0,
          },
        };
      }
      if (type === 'students') {
        return {
          ...item,
          studentProfile: item.studentprofile,
          internshipStudents: (item.internshipstudent || []).map((s: any) => ({
            ...s,
            internship: s.internship,
          })),
        };
      }
      if (type === 'teachers') {
        return {
          ...item,
          teacherProfile: item.teacherprofile,
          _count: {
            internships: item._count?.internship || 0,
            proposedTopics: item._count?.proposedTopics || 0,
          },
        };
      }
      if (type === 'companies') {
        return {
          ...item,
          companyProfile: item.companyprofile,
          _count: {
            proposedTopics: item._count?.proposedTopics || 0,
          },
        };
      }
      if (type === 'topics') {
        return {
          ...item,
          proposedBy: item.proposedBy || { name: 'Unknown' },
          internshipStatus: item.internship?.status || null,
          completedAt: item.internship?.completedAt || null,
          _count: {
            studentApplications: item._count?.studentapplication || 0,
          },
        };
      }
      return item;
    });

    return NextResponse.json({ data: mappedData });
  } catch (error) {
    console.error('[admin/archives/data]', error);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}
