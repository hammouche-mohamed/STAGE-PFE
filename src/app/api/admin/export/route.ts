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
          teacher: { select: { name: true, email: true } },
          students: { include: { student: { select: { name: true, email: true } } } },
        },
        orderBy: { createdAt: 'asc' },
      });

      rows.push('=== INTERNSHIPS ===');
      rows.push('ID,Academic Year,Type,Status,Topic,Teacher,Students,Start Date,End Date,Midterm Deadline,Final Deadline');
      for (const i of internships) {
        const students = i.students.map((s) => s.student.name).join(' | ');
        rows.push(
          [
            i.id,
            i.academicYear,
            i.internshipType ?? 'N/A',
            i.status,
            `"${i.topic.title.replace(/"/g, '""')}"`,
            `"${i.teacher.name}"`,
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
              students: { include: { student: { select: { name: true } } } },
            },
          },
          uploadedBy: { select: { name: true, role: true } },
        },
        orderBy: { uploadedAt: 'asc' },
      });

      rows.push('=== DOCUMENTS ===');
      rows.push('ID,Type,Name,Uploaded By,Role,Status,Uploaded At,Topic,Students');
      for (const d of documents) {
        const students = d.internship.students.map((s) => s.student.name).join(' | ');
        rows.push(
          [
            d.id,
            d.type,
            `"${d.fileName.replace(/"/g, '""')}"`,
            `"${d.uploadedBy.name}"`,
            d.uploadedBy.role,
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
          sender: { select: { name: true, role: true } },
          internship: {
            include: { topic: { select: { title: true } } },
          },
        },
        orderBy: { sentAt: 'asc' },
      });

      rows.push('=== MESSAGES ===');
      rows.push('ID,Sent At,Sender,Role,Internship Topic,Content Preview,Requires Action');
      for (const m of messages) {
        const preview = m.content.substring(0, 80).replace(/"/g, '""').replace(/\n/g, ' ');
        rows.push(
          [
            m.id,
            m.sentAt.toISOString(),
            `"${m.sender.name}"`,
            m.sender.role,
            `"${m.internship.topic.title.replace(/"/g, '""')}"`,
            `"${preview}"`,
            m.requiresAction ? 'YES' : 'NO',
          ].join(','),
        );
      }
      rows.push('');
    }

    if (type === 'students' || type === 'all') {
      const students = await prisma.user.findMany({
        where: { 
          role: 'STUDENT', 
          studentprofile: { academicYear: year || undefined, ...(filiereId && { filiereId }) } 
        },
        include: { studentprofile: { include: { filiere: true } } }
      });
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
      const teachers = await prisma.user.findMany({
        where: { 
          role: 'TEACHER',
          OR: [
            { proposedTopics: { some: { academicYear: year || undefined, ...(filiereId && { filiereId }) } } },
            { assignedTopics: { some: { academicYear: year || undefined, ...(filiereId && { filiereId }) } } }
          ]
        },
        include: { teacherprofile: { include: { filiere: true } } }
      });
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
      const topics = await prisma.topic.findMany({
        where: { academicYear: year || undefined, ...(filiereId && { filiereId }) },
        include: { user_topic_proposedByIdTouser: { select: { name: true } }, filiere: true }
      });
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
