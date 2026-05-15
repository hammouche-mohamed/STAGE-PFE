import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * Archive Rules (read-only historical view of a given academic year):
 * - Internships: ALL of that year — finished AND ongoing. Ongoing ones are
 *   shown/"mentioned" (via their status) and are NEVER deleted; they carry
 *   over into the new year.
 * - Topics: the year's REJECTED topics + TAKEN topics whose internship
 *   finished (and any manually-archived). Pending/approved/open carry over.
 * - Students: every student enrolled that year (reference — never deleted).
 * - Teachers: every teacher who supervised ANY internship or held topics
 *   that year (not only finished).
 * - Companies: every company that proposed ANY topic that year.
 * - Documents: documents of finished internships that year.
 * - Audit: time-boxed to the academic year (Sept → Aug).
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

  // A non-super admin must be scoped to a department. If they somehow have
  // none, return nothing rather than leaking every department's archive.
  if (!session.user.isSuperAdmin && !filiereId) {
    return NextResponse.json({ data: [] });
  }

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
            // Show the student's internship that year — finished or ongoing.
            internshipstudent: {
              where: { internship: { academicYear: year } },
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
            // Any teacher who supervised an internship OR was assigned a
            // topic that year — not gated on the internship being finished.
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
      // Show companies whose topics were taken AND resulted in a finished internship.
      case 'companies':
        data = await prisma.user.findMany({
          where: {
            role: 'COMPANY',
            // Any company that proposed a topic that year (regardless of
            // whether it was taken / finished).
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

      // ── TOPICS ──────────────────────────────────────────────────────────────
      // A topic shows in Archives when either:
      //   • it was manually archived by an admin (archivedAt set) — this
      //     covers APPROVED and REJECTED topics the admin chose to retire, OR
      //   • it is TAKEN and its linked internship is COMPLETED or CANCELLED
      //     (auto-archived once the internship ends).
      // Pending / approved-unclaimed / open / rejected-but-not-archived
      // topics stay live in the main tables so the app keeps working into
      // the next academic year.
      case 'topics':
        data = await prisma.topic.findMany({
          where: {
            academicYear: year,
            ...(filiereId && { filiereId }),
            ...(internshipTypeFilter && internshipTypeFilter !== 'ALL'
              ? { internshipType: internshipTypeFilter as any }
              : {}),
            // The year's finished + rejected topics (and any manually
            // archived). Pending/approved/open carry over → not shown here.
            OR: [
              { status: 'REJECTED' },
              { status: 'TAKEN', internship: { status: { in: FINISHED_STATUSES } } },
              { archivedAt: { not: null } },
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
            // Department scoping: a dept admin only sees audit entries whose
            // acting user belongs to their filière (via their profile).
            // Super admin (filiereId === null) sees everything.
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
      // ALL internships of the year — finished AND ongoing. Ongoing ones are
      // shown (their status "mentions" them) and are never deleted; they
      // carry over. The page distinguishes them via the STATUS column.
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
