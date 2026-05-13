import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/admin/messages?year=2024-2025
// Returns all internship message threads (grouped by internship) for admin oversight
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: session ? 403 : 401 });
  }
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year');
  const paramFiliereId = searchParams.get('filiereId');

  // If super admin, they can see everything or filter by param
  // If department admin, they only see their department
  const filiereId = session.user.isSuperAdmin 
    ? (paramFiliereId || null) 
    : session.user.filiereId;

  try {
    const rawInternships = await prisma.internship.findMany({
      where: {
        academicYear: (year && year !== 'all') ? year : undefined,
        // Archives usually means finished, but for oversight we should see Active too
        status: { in: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
        ...(filiereId && filiereId !== 'all' && { topic: { filiereId } })
      },
      include: {
        topic: { select: { title: true, internshipType: true } },
        user: { select: { name: true } },
        internshipstudent: { include: { user: { select: { name: true } } } },
        message: {
          select: { id: true, content: true, sentAt: true },
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
        _count: { select: { message: true } },
      },
      orderBy: { createdAt: 'desc' },
    } as any);

    const threads = rawInternships.map((i: any) => ({
      internshipId: i.id,
      topic: i.topic.title,
      internshipType: i.internshipType ?? 'N/A',
      academicYear: i.academicYear,
      students: i.internshipstudent.map((s: any) => s.user.name),
      teacher: i.user.name,
      totalMessages: i._count.message,
      lastMessage: i.message[0]?.content?.substring(0, 60) ?? '',
      lastSentAt: i.message[0]?.sentAt?.toISOString() ?? null,
    }));

    return NextResponse.json({ data: threads });
  } catch (error) {
    console.error('[admin/messages]', error);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}
