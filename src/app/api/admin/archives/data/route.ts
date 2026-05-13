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

  if (!year || year === 'all') {
    return NextResponse.json({ error: 'Specific academic year required for detailed archives' }, { status: 400 });
  }

  const filiereId = session.user.isSuperAdmin 
    ? (paramFiliereId && paramFiliereId !== 'all' ? paramFiliereId : null) 
    : session.user.filiereId;

  try {
    let data = [];

    switch (type) {
      case 'students':
        data = await prisma.user.findMany({
          where: {
            role: 'STUDENT',
            studentprofile: { 
              academicYear: year,
              ...(filiereId && { filiereId })
            }
          },
          include: {
            studentprofile: { include: { filiere: true } },
            internshipstudent: {
              where: { internship: { academicYear: year } },
              include: { internship: { include: { topic: true } } }
            }
          }
        } as any);
        break;

      case 'teachers':
        data = await prisma.user.findMany({
          where: {
            role: 'TEACHER',
            OR: [
              { proposedTopics: { some: { academicYear: year, ...(filiereId && { filiereId }) } } },
              { assignedTopics: { some: { academicYear: year, ...(filiereId && { filiereId }) } } },
              { internship: { some: { academicYear: year, ...(filiereId && { topic: { filiereId } }) } } }
            ]
          },
          include: {
            teacherprofile: { include: { filiere: true } },
            _count: {
              select: {
                internship: { where: { academicYear: year } },
                proposedTopics: { where: { academicYear: year } }
              }
            }
          }
        } as any);
        break;

      case 'companies':
        data = await prisma.user.findMany({
          where: {
            role: 'COMPANY',
            proposedTopics: { some: { academicYear: year, ...(filiereId && { filiereId }) } }
          },
          include: {
            companyprofile: true,
            _count: {
              select: {
                proposedTopics: { where: { academicYear: year } }
              }
            }
          }
        } as any);
        break;

      case 'topics':
        data = await prisma.topic.findMany({
          where: {
            academicYear: year,
            ...(filiereId && { filiereId })
          },
          include: {
            proposedBy: { select: { name: true, email: true } },
            filiere: true,
            _count: { select: { studentapplication: true } }
          }
        } as any);
        break;

      case 'documents':
        data = await prisma.document.findMany({
          where: {
            internship: { 
              academicYear: year,
              ...(filiereId && { topic: { filiereId } })
            }
          },
          include: {
            uploadedBy: { select: { name: true, role: true } },
            internship: { include: { topic: { select: { title: true } } } }
          }
        } as any);
        break;

      case 'audit':
        // Map academic year to date range (roughly Sept to Sept)
        const [startYearStr, endYearStr] = year.split('-');
        const startDate = new Date(`${startYearStr}-09-01`);
        const endDate = new Date(`${endYearStr}-08-31T23:59:59`);
        
        data = await prisma.auditLog.findMany({
          where: {
            createdAt: { gte: startDate, lte: endDate }
          },
          include: {
            user: { select: { name: true, email: true } }
          },
          orderBy: { createdAt: 'desc' }
        } as any);
        break;

      case 'internships':
      default:
        data = await prisma.internship.findMany({
          where: {
            academicYear: year,
            ...(filiereId && { topic: { filiereId } })
          },
          include: {
            topic: { select: { title: true, internshipType: true } },
            user: { select: { name: true, email: true } },
            internshipstudent: { include: { user: { select: { name: true, email: true } } } },
            _count: { select: { message: true, document: true } }
          },
          orderBy: { createdAt: 'desc' }
        } as any);
        break;
    }

    // Map schema field names back to friendly names expected by the client
    const mappedData = (data as any[]).map(item => {
      if (type === 'internships') {
        return {
          ...item,
          teacher: item.user || { name: 'Unknown' },
          students: (item.internshipstudent || []).map((s: any) => ({
            ...s,
            student: s.user
          })),
          _count: {
            messages: item._count?.message || 0,
            documents: item._count?.document || 0
          }
        };
      }
      if (type === 'students') {
        return {
          ...item,
          studentProfile: item.studentprofile,
          internshipStudents: (item.internshipstudent || []).map((s: any) => ({
            ...s,
            internship: s.internship
          }))
        };
      }
      if (type === 'teachers') {
        return {
          ...item,
          teacherProfile: item.teacherprofile,
          _count: {
            internships: item._count?.internship || 0,
            proposedTopics: item._count?.proposedTopics || 0
          }
        };
      }
      if (type === 'companies') {
        return {
          ...item,
          companyProfile: item.companyprofile,
          _count: {
            proposedTopics: item._count?.proposedTopics || 0
          }
        };
      }
      if (type === 'topics') {
        return {
          ...item,
          proposedBy: item.proposedBy || { name: 'Unknown' },
          _count: {
            studentApplications: item._count?.studentapplication || 0
          }
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
