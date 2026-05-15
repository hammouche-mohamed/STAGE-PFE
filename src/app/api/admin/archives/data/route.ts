import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * Archive Rules:
 * - Internships: only COMPLETED or CANCELLED
 * - Topics: only TAKEN topics whose linked internship is COMPLETED or CANCELLED
 * - Students: all enrolled that year (read-only reference — never moved/deleted)
 * - Teachers: all who supervised at least one internship that year (read-only reference)
 * - Companies: all who proposed at least one topic that year (read-only reference)
 * - Documents: only those belonging to a COMPLETED or CANCELLED internship
 * - Audit: time-boxed to the academic year (Sept → Aug)
 */

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

  // Only these internship statuses are considered "finished" / archivable
  const FINISHED_STATUSES = ['COMPLETED', 'CANCELLED'];

  try {
    let data: any[] = [];

    switch (type) {

      // ── STUDENTS ────────────────────────────────────────────────────────────
      // Show all students enrolled that year. Read-only reference only.
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
            // Only show internship assignments that are finished
            internshipstudent: {
              where: { internship: { academicYear: year, status: { in: FINISHED_STATUSES } } },
              include: { internship: { include: { topic: { select: { title: true } } } } },
            },
          },
          orderBy: { name: 'asc' },
        } as any);
        break;

      // ── TEACHERS ────────────────────────────────────────────────────────────
      // Show all teachers who supervised a finished internship that year.
      case 'teachers':
        data = await prisma.user.findMany({
          where: {
            role: 'TEACHER',
            internship: {
              some: {
                academicYear: year,
                status: { in: FINISHED_STATUSES },
                ...(filiereId && { topic: { filiereId } }),
              },
            },
          } as any,
          include: {
            teacherprofile: { include: { filiere: true } },
            _count: {
              select: {
                internship: {
                  where: {
                    academicYear: year,
                    status: { in: FINISHED_STATUSES },
                  },
                },
                proposedTopics: {
                  where: {
                    academicYear: year,
                    status: 'TAKEN',
                  }
                }
              },
            },
          },
          orderBy: { name: 'asc' },
        } as any);
        break;

      // ── COMPANIES ───────────────────────────────────────────────────────────
      // Show companies whose topics were taken AND resulted in a finished internship.
      case 'companies':
        data = await prisma.user.findMany({
          where: {
            role: 'COMPANY',
            proposedTopics: {
              some: {
                academicYear: year,
                status: 'TAKEN',
                internship: { status: { in: FINISHED_STATUSES } },
                ...(filiereId && { filiereId }),
              },
            },
          } as any,
          include: {
            companyprofile: true,
            _count: {
              select: {
                proposedTopics: {
                  where: {
                    academicYear: year,
                    status: 'TAKEN',
                    internship: { status: { in: FINISHED_STATUSES } },
                  },
                },
              },
            },
          },
          orderBy: { name: 'asc' },
        } as any);
        break;

      // ── TOPICS ──────────────────────────────────────────────────────────────
      // Two cohorts qualify as "finished" for archive purposes:
      //   • TAKEN topics whose linked internship is COMPLETED or CANCELLED
      //   • REJECTED topics (refused by the admin / teacher / company)
      // Pending, approved-unclaimed, open-for-selection, or in-progress
      // topics are NOT archived — they stay live in the main tables so the
      // app keeps working into the next academic year.
      case 'topics':
        data = await prisma.topic.findMany({
          where: {
            academicYear: year,
            ...(filiereId && { filiereId }),
            ...(internshipTypeFilter && internshipTypeFilter !== 'ALL'
              ? { internshipType: internshipTypeFilter as any }
              : {}),
            OR: [
              { status: 'TAKEN', internship: { status: { in: FINISHED_STATUSES } } },
              { status: 'REJECTED' },
            ],
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
      // Only documents from finished internships.
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
      // Time-boxed to the academic year (Sept 1 → Aug 31).
      case 'audit': {
        const [startYearStr, endYearStr] = year.split('-');
        const startDate = new Date(`${startYearStr}-09-01`);
        const endDate = new Date(`${endYearStr}-08-31T23:59:59`);

        data = await prisma.auditLog.findMany({
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
          include: {
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        } as any);
        break;
      }

      // ── INTERNSHIPS ─────────────────────────────────────────────────────────
      // Only COMPLETED or CANCELLED internships.
      case 'internships':
      default:
        data = await prisma.internship.findMany({
          where: {
            academicYear: year,
            status: { in: FINISHED_STATUSES },
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
