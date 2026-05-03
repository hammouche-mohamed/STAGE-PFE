import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/admin/messages?year=2024-2025
// Returns all internship message threads (grouped by internship) for admin oversight
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year');

  try {
    const internships = await prisma.internship.findMany({
      where: year ? { academicYear: year } : {},
      include: {
        topic: { select: { title: true, internshipType: true } },
        teacher: { select: { name: true } },
        students: { include: { student: { select: { name: true } } } },
        messages: {
          select: { id: true, content: true, sentAt: true },
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const threads = internships.map((i) => ({
      internshipId: i.id,
      topic: i.topic.title,
      internshipType: i.internshipType ?? 'N/A',
      academicYear: i.academicYear,
      students: i.students.map((s) => s.student.name),
      teacher: i.teacher.name,
      totalMessages: i._count.messages,
      lastMessage: i.messages[0]?.content?.substring(0, 60) ?? '',
      lastSentAt: i.messages[0]?.sentAt?.toISOString() ?? null,
    }));

    return NextResponse.json({ data: threads });
  } catch (error) {
    console.error('[admin/messages]', error);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}
