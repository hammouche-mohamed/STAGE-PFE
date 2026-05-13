import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/admin/export?year=2024-2025&type=internships|messages|documents|all
// Streams a CSV file the admin can download
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year') || '';
  const type = searchParams.get('type') || 'all';
  const paramFiliereId = searchParams.get('filiereId');

  // If super admin, they can see everything or filter by param
  // If department admin, they only see their department
  const filiereId = session.user.isSuperAdmin 
    ? (paramFiliereId || null) 
    : session.user.filiereId;

  const yearFilter = year ? { academicYear: year } : {};
  const filiereFilter = filiereId ? { topic: { filiereId } } : {};

  try {
    const rows: string[] = [];

    if (type === 'internships' || type === 'all') {
      const internships = await prisma.internship.findMany({
        where: { ...yearFilter, ...filiereFilter },
        include: {
          topic: { select: { title: true, internshipType: true } },
          user: { select: { name: true, email: true } },
          internshipstudent: { include: { user: { select: { name: true, email: true } } } },
        },
        orderBy: { createdAt: 'asc' },
      });

      rows.push('=== INTERNSHIPS ===');
      rows.push('ID,Academic Year,Type,Status,Topic,Teacher,Students,Start Date,End Date,Midterm Deadline,Final Deadline');
      for (const i of internships) {
        const students = ((i as any).internshipstudent || []).map((s: any) => s.user?.name).join(' | ');
        const teacherName = (i as any).user?.name || 'N/A';
        rows.push(
          [
            i.id,
            i.academicYear,
            i.internshipType ?? 'N/A',
            i.status,
            `"${i.topic.title.replace(/"/g, '""')}"`,
            `"${teacherName}"`,
            `"${students}"`,
            i.startDate?.toISOString().split('T')[0] ?? '',
            i.endDate?.toISOString().split('T')[0] ?? '',
            i.midtermDeadline?.toISOString().split('T')[0] ?? '',
            i.finalDeadline?.toISOString().split('T')[0] ?? '',
          ].join(','),
        );
      }
      rows.push('');
    }

    if (type === 'documents' || type === 'all') {
      const documents = await prisma.document.findMany({
        where: {
          internship: { ...(year ? { academicYear: year } : {}), ...(filiereId ? { topic: { filiereId } } : {}) },
        },
        include: {
          internship: {
            include: {
              topic: { select: { title: true } },
              internshipstudent: { include: { user: { select: { name: true } } } },
            },
          },
          user_document_uploadedByIdTouser: { select: { name: true, role: true } },
        },
        orderBy: { uploadedAt: 'asc' },
      });

      rows.push('=== DOCUMENTS ===');
      rows.push('ID,Type,Name,Uploaded By,Role,Status,Uploaded At,Topic,Students');
      for (const d of documents) {
        const students = ((d as any).internship?.internshipstudent || []).map((s: any) => s.user?.name).join(' | ');
        const uploadedBy = (d as any).user_document_uploadedByIdTouser || { name: 'N/A', role: 'N/A' };
        rows.push(
          [
            d.id,
            d.type,
            `"${d.fileName.replace(/"/g, '""')}"`,
            `"${uploadedBy.name}"`,
            uploadedBy.role,
            d.status,
            d.uploadedAt.toISOString(),
            `"${d.internship.topic.title.replace(/"/g, '""')}"`,
            `"${students}"`,
          ].join(','),
        );
      }
      rows.push('');
    }

    if (type === 'messages' || type === 'all') {
      const messages = await prisma.message.findMany({
        where: {
          internship: { ...(year ? { academicYear: year } : {}), ...(filiereId ? { topic: { filiereId } } : {}) },
        },
        include: {
          user: { select: { name: true, role: true } },
          internship: {
            include: { topic: { select: { title: true } } },
          },
        },
        orderBy: { sentAt: 'asc' },
      });

      rows.push('=== MESSAGES ===');
      rows.push('ID,Sent At,Sender,Role,Internship Topic,Content Preview,Requires Action');
      for (const m of messages) {
        const sender = (m as any).user || { name: 'N/A', role: 'N/A' };
        const preview = m.content.substring(0, 80).replace(/"/g, '""').replace(/\n/g, ' ');
        rows.push(
          [
            m.id,
            m.sentAt.toISOString(),
            `"${sender.name}"`,
            sender.role,
            `"${m.internship.topic.title.replace(/"/g, '""')}"`,
            `"${preview}"`,
            m.requiresAction ? 'YES' : 'NO',
          ].join(','),
        );
      }
      rows.push('');
    }

    if (type === 'students' || type === 'all') {
      const rawStudents = await prisma.user.findMany({
        where: { 
          role: 'STUDENT', 
          studentprofile: { academicYear: year || undefined, ...(filiereId && { filiereId }) } 
        },
        include: { studentprofile: { include: { filiere: true } } }
      } as any);
      const students = rawStudents.map((s: any) => ({
        ...s,
        studentProfile: s.studentprofile
      }));
      rows.push('=== STUDENTS ===');
      rows.push('ID,Name,Email,Department,Speciality,Level');
      for (const s of students) {
        rows.push([
          s.id,
          `"${s.name}"`,
          s.email,
          `"${s.studentProfile?.filiere?.name || ''}"`,
          `"${s.studentProfile?.speciality || ''}"`,
          s.studentProfile?.level || ''
        ].join(','));
      }
      rows.push('');
    }

    if (type === 'teachers' || type === 'all') {
      const rawTeachers = await prisma.user.findMany({
        where: { 
          role: 'TEACHER',
          OR: [
            { proposedTopics: { some: { academicYear: year || undefined, ...(filiereId && { filiereId }) } } },
            { assignedTopics: { some: { academicYear: year || undefined, ...(filiereId && { filiereId }) } } }
          ]
        },
        include: { teacherprofile: { include: { filiere: true } } }
      } as any);
      const teachers = rawTeachers.map((t: any) => ({
        ...t,
        teacherProfile: t.teacherprofile
      }));
      rows.push('=== TEACHERS ===');
      rows.push('ID,Name,Email,Grade,Department,Speciality');
      for (const t of teachers) {
        rows.push([
          t.id,
          `"${t.name}"`,
          t.email,
          t.teacherProfile?.grade || '',
          `"${t.teacherProfile?.filiere?.name || ''}"`,
          `"${t.teacherProfile?.speciality || ''}"`
        ].join(','));
      }
      rows.push('');
    }

    if (type === 'topics' || type === 'all') {
      const rawTopics = await prisma.topic.findMany({
        where: { academicYear: year || undefined, ...(filiereId && { filiereId }) },
        include: { user_topic_proposedByIdTouser: { select: { name: true } }, filiere: true }
      } as any);
      const topics = rawTopics.map((t: any) => ({
        ...t,
        proposedBy: t.user_topic_proposedByIdTouser || null
      }));
      rows.push('=== TOPICS ===');
      rows.push('ID,Title,Type,Status,Proposed By,Department,Capacity');
      for (const t of topics) {
        rows.push([
          t.id,
          `"${t.title.replace(/"/g, '""')}"`,
          t.type,
          t.status,
          `"${t.proposedBy.name}"`,
          `"${t.filiere?.name || ''}"`,
          t.maxStudents
        ].join(','));
      }
    }

    const csv = rows.join('\n');
    const filename = `history_${year || 'all'}_${type}_${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[admin/export]', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
